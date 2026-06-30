/**
 * Seed script for local development and demos.
 *
 * Generates realistic Pakistani-context data (real cities, valid-format CNIC/NTN
 * patterns, plausible PKR amounts) per Section 10 of the build prompt:
 *   - 5 societies across Lahore, Islamabad, Karachi (varied tiers/stages)
 *   - 4–6 inventory categories per society, 2–3 payment plans each
 *   - 8–10 dealers (some DNFBP-verified, some pending)
 *   - 15–20 buyers with varied ATL statuses
 *   - bookings spread across every escrow state
 *   - reviews ONLY against bookings that actually completed
 *
 * Two rules from `database.mdc` are load-bearing here:
 *   1. CNIC/NTN are written ONLY as ciphertext, via `encrypt()` — never plaintext.
 *   2. Ledger rows are produced by the domain builder (`createLedgerEvent`) and
 *      escrow transitions by the domain state machine (`transitionEscrowState`),
 *      then INSERTed — the seed exercises the same code path production uses,
 *      rather than hand-writing audit rows.
 *
 * It is idempotent: it TRUNCATEs all tables first. TRUNCATE is used (not DELETE)
 * deliberately — the append-only trigger from ADR-004 blocks row-level
 * DELETE/UPDATE on LedgerEvent, and a full admin-level reset must bypass that,
 * which TRUNCATE does. Determinism: no `Math.random()` — every value is derived
 * from a loop index so re-running yields the same shape.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { calculateTransferTax, lookupFbrValuation } from "@sectoria/domain-tax";
import {
  createLedgerEvent,
  LedgerEventType,
} from "@sectoria/domain-ledger";
import { transitionEscrowState } from "@sectoria/domain-escrow";
import {
  AtlStatus,
  EscrowAction,
  EscrowState,
  UserRole,
  idSchema,
  pkrAmountSchema,
  type AtlStatus as AtlStatusType,
  type EscrowEvent,
  type EscrowState as EscrowStateType,
  type LedgerEvent,
  type PlotType as PlotTypeType,
} from "@sectoria/types";
import { encrypt } from "../src/encryption.js";

const prisma = new PrismaClient();

/** Casts a plain value to Prisma's JSON input type at the persistence boundary. */
function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/** Narrows an indexed lookup that we know is in range (modulo / bounded index). */
function requireDefined<T>(value: T | undefined, what: string): T {
  if (value === undefined) {
    throw new Error(`Expected a defined value for ${what}, got undefined.`);
  }
  return value;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A monotonically increasing clock for the seed. Real ledger/audit data is
 * ordered in time; rather than scatter `new Date()` calls (non-deterministic),
 * we start from a fixed instant and advance it a step at a time.
 */
const SEED_EPOCH = new Date("2026-01-05T09:00:00.000Z").getTime();
let clockOffsetMs = 0;
function nextTimestamp(): string {
  clockOffsetMs += 7 * 60 * 1000; // 7 minutes between events.
  return new Date(SEED_EPOCH + clockOffsetMs).toISOString();
}

// Valid-format but entirely fake identifiers. Area code 35202 = Lahore.
function fakeCnic(seq: number): string {
  const serial = String(100000 + (seq % 900000)).padStart(7, "0");
  const check = String(seq % 10);
  return `35202-${serial}-${check}`;
}
function fakeNtn(seq: number): string {
  return `${String(1000000 + (seq % 9000000))}-${seq % 10}`;
}
function fakePhone(seq: number): string {
  return `+92300${String(1000000 + (seq % 9000000))}`;
}

// ── Reference data ─────────────────────────────────────────────────

const RESIDENTIAL_SIZES = [
  { sizeLabel: "3 Marla", sizeSqft: 816 },
  { sizeLabel: "5 Marla", sizeSqft: 1361 },
  { sizeLabel: "10 Marla", sizeSqft: 2722 },
  { sizeLabel: "1 Kanal", sizeSqft: 5445 },
] as const;

const COMMERCIAL_SIZES = [
  { sizeLabel: "4 Marla Commercial", sizeSqft: 1089 },
  { sizeLabel: "8 Marla Commercial", sizeSqft: 2178 },
] as const;

interface SocietySpec {
  readonly slug: string;
  readonly name: string;
  readonly city: string;
  readonly authority: string;
  readonly verificationTier: "PENDING" | "VERIFIED" | "HSMS_LINKED";
  readonly hsmsLinked: boolean;
  readonly developmentStage: string;
  readonly developmentPct: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly categoryCount: number;
  readonly basePricePerSqft: number; // rupees per sqft
}

const SOCIETY_SPECS: readonly SocietySpec[] = [
  {
    slug: "dha-lahore",
    name: "DHA Lahore",
    city: "Lahore",
    authority: "LDA",
    verificationTier: "HSMS_LINKED",
    hsmsLinked: true,
    developmentStage: "Possession Underway",
    developmentPct: 85,
    latitude: 31.4697,
    longitude: 74.4117,
    categoryCount: 6,
    basePricePerSqft: 32000,
  },
  {
    slug: "bahria-town-lahore",
    name: "Bahria Town Lahore",
    city: "Lahore",
    authority: "LDA",
    verificationTier: "VERIFIED",
    hsmsLinked: false,
    developmentStage: "Under Development",
    developmentPct: 60,
    latitude: 31.3668,
    longitude: 74.1875,
    categoryCount: 5,
    basePricePerSqft: 21000,
  },
  {
    slug: "capital-smart-city",
    name: "Capital Smart City",
    city: "Islamabad",
    authority: "RDA",
    verificationTier: "VERIFIED",
    hsmsLinked: false,
    developmentStage: "Under Development",
    developmentPct: 45,
    latitude: 33.4709,
    longitude: 72.8214,
    categoryCount: 4,
    basePricePerSqft: 18000,
  },
  {
    slug: "dha-islamabad",
    name: "DHA Islamabad",
    city: "Islamabad",
    authority: "CDA",
    verificationTier: "HSMS_LINKED",
    hsmsLinked: true,
    developmentStage: "Possession Underway",
    developmentPct: 90,
    latitude: 33.5349,
    longitude: 73.1568,
    categoryCount: 5,
    basePricePerSqft: 38000,
  },
  {
    slug: "bahria-town-karachi",
    name: "Bahria Town Karachi",
    city: "Karachi",
    authority: "MDA",
    verificationTier: "PENDING",
    hsmsLinked: false,
    developmentStage: "Under Development",
    developmentPct: 30,
    latitude: 25.0,
    longitude: 67.3,
    categoryCount: 4,
    basePricePerSqft: 15000,
  },
];

const PHASES = ["Phase 1", "Phase 2", "Phase 3", "Sector A", "Sector B"] as const;
const BLOCKS = ["Block A", "Block B", "Block C", "Block D"] as const;
const FBR_ZONES = ["Zone-I", "Zone-II", "Zone-III"] as const;

const AMENITY_POOL = [
  "Gated Security",
  "Underground Electricity",
  "Community Park",
  "Grand Mosque",
  "Commercial Hub",
  "Sewerage Treatment",
  "Wide Carpeted Roads",
  "School & Hospital",
];

const ATL_CYCLE: readonly AtlStatusType[] = [
  AtlStatus.FILER,
  AtlStatus.NON_FILER,
  AtlStatus.LATE_FILER,
];

// ── Booking escrow distribution ────────────────────────────────────

/** Every state we want represented in the seed, in creation order. */
const BOOKING_TARGET_STATES: readonly EscrowStateType[] = [
  EscrowState.BOOKING_TOKEN_PAID,
  EscrowState.BOOKING_TOKEN_PAID,
  EscrowState.ALLOCATED,
  EscrowState.ALLOCATED,
  EscrowState.INSTALLMENT_DUE,
  EscrowState.INSTALLMENT_PAID,
  EscrowState.INSTALLMENT_PAID,
  EscrowState.FULLY_PAID,
  EscrowState.DOCUMENTS_ISSUED,
  EscrowState.COMMISSION_RELEASED,
  EscrowState.COMMISSION_RELEASED,
  EscrowState.COMMISSION_RELEASED,
  EscrowState.CANCELLED,
  EscrowState.CANCELLED,
];

/** The escrow actions that walk a fresh booking to the requested final state. */
function actionsToReach(target: EscrowStateType): EscrowAction[] {
  switch (target) {
    case EscrowState.BOOKING_TOKEN_PAID:
      return [];
    case EscrowState.ALLOCATED:
      return [EscrowAction.ALLOCATE];
    case EscrowState.INSTALLMENT_DUE:
      return [EscrowAction.ALLOCATE, EscrowAction.RAISE_INSTALLMENT];
    case EscrowState.INSTALLMENT_PAID:
      return [
        EscrowAction.ALLOCATE,
        EscrowAction.RAISE_INSTALLMENT,
        EscrowAction.PAY_INSTALLMENT,
      ];
    case EscrowState.FULLY_PAID:
      return [
        EscrowAction.ALLOCATE,
        EscrowAction.RAISE_INSTALLMENT,
        EscrowAction.PAY_INSTALLMENT,
        EscrowAction.COMPLETE_PAYMENT,
      ];
    case EscrowState.DOCUMENTS_ISSUED:
      return [
        EscrowAction.ALLOCATE,
        EscrowAction.RAISE_INSTALLMENT,
        EscrowAction.PAY_INSTALLMENT,
        EscrowAction.COMPLETE_PAYMENT,
        EscrowAction.ISSUE_DOCUMENTS,
      ];
    case EscrowState.COMMISSION_RELEASED:
      return [
        EscrowAction.ALLOCATE,
        EscrowAction.RAISE_INSTALLMENT,
        EscrowAction.PAY_INSTALLMENT,
        EscrowAction.COMPLETE_PAYMENT,
        EscrowAction.ISSUE_DOCUMENTS,
        EscrowAction.RELEASE_COMMISSION,
      ];
    case EscrowState.CANCELLED:
      return [EscrowAction.ALLOCATE, EscrowAction.CANCEL];
    default:
      return [];
  }
}

const PLOT_HELD_STATES = new Set<EscrowStateType>([
  EscrowState.ALLOCATED,
  EscrowState.INSTALLMENT_DUE,
  EscrowState.INSTALLMENT_PAID,
  EscrowState.FULLY_PAID,
  EscrowState.DOCUMENTS_ISSUED,
  EscrowState.COMMISSION_RELEASED,
]);
const TITLE_TRANSFERRED_STATES = new Set<EscrowStateType>([
  EscrowState.DOCUMENTS_ISSUED,
  EscrowState.COMMISSION_RELEASED,
]);

// ── In-memory references built up while seeding ────────────────────

interface SeededCategory {
  readonly id: string;
  readonly societyId: string;
  readonly plotType: PlotTypeType;
  readonly sizeSqft: number;
  readonly pricePerSqftRupees: number;
  readonly fbrValuationZone: string;
  readonly paymentPlanIds: string[];
  readonly plotIds: string[];
  nextPlotIndex: number;
}

interface SeededSociety {
  readonly id: string;
  readonly adminUserId: string;
  readonly categories: SeededCategory[];
}

async function main(): Promise<void> {
  console.log("Resetting database (TRUNCATE … RESTART IDENTITY CASCADE)…");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE
       "LedgerEvent","Review","SocietyPartnerAuthorization","Plot",
       "Booking","PaymentPlan","InventoryCategory","DealerProfile",
       "User","Society"
     RESTART IDENTITY CASCADE;`,
  );

  const superAdmin = await prisma.user.create({
    data: {
      name: "Sectoria Platform Admin",
      phone: fakePhone(1),
      email: "admin@sectoria.pk",
      role: UserRole.SUPER_ADMIN,
      atlStatus: AtlStatus.FILER,
      nadraVerified: true,
    },
  });

  const seededSocieties: SeededSociety[] = [];
  let userSeq = 100;

  for (const [societyIndex, spec] of SOCIETY_SPECS.entries()) {
    const society = await prisma.society.create({
      data: {
        slug: spec.slug,
        name: spec.name,
        city: spec.city,
        citySlug: slugify(spec.city),
        authority: spec.authority,
        lopReferenceNo:
          spec.verificationTier === "PENDING"
            ? null
            : `LOP-${spec.authority}-${2024 + societyIndex}-${100 + societyIndex}`,
        nocReferenceNo:
          spec.verificationTier === "PENDING"
            ? null
            : `NOC-${spec.authority}-${2024 + societyIndex}-${200 + societyIndex}`,
        hsmsLinked: spec.hsmsLinked,
        verificationTier: spec.verificationTier,
        description: `${spec.name} is a ${spec.developmentStage.toLowerCase()} housing society in ${spec.city}, approved by the ${spec.authority}.`,
        amenities: AMENITY_POOL.slice(0, 4 + (societyIndex % 4)),
        latitude: spec.latitude,
        longitude: spec.longitude,
        developmentStage: spec.developmentStage,
        developmentPct: spec.developmentPct,
        heroImageUrl: `https://images.sectoria.pk/societies/${spec.slug}.jpg`,
      },
    });

    userSeq += 1;
    const admin = await prisma.user.create({
      data: {
        name: `${spec.name} Admin`,
        phone: fakePhone(userSeq),
        email: `admin@${spec.slug}.pk`,
        role: UserRole.SOCIETY_ADMIN,
        atlStatus: AtlStatus.FILER,
        nadraVerified: true,
        societyId: society.id,
      },
    });

    const categories: SeededCategory[] = [];
    for (let c = 0; c < spec.categoryCount; c += 1) {
      const isCommercial = c % 4 === 3; // roughly 1 in 4 categories is commercial
      const plotType: PlotTypeType = isCommercial ? "COMMERCIAL" : "RESIDENTIAL";
      const size = isCommercial
        ? requireDefined(
            COMMERCIAL_SIZES[c % COMMERCIAL_SIZES.length],
            "commercial size",
          )
        : requireDefined(
            RESIDENTIAL_SIZES[c % RESIDENTIAL_SIZES.length],
            "residential size",
          );

      const phase = requireDefined(PHASES[c % PHASES.length], "phase");
      const block = requireDefined(BLOCKS[c % BLOCKS.length], "block");
      const pricePerSqftRupees =
        spec.basePricePerSqft *
        (isCommercial ? 1.8 : 1) *
        (1 + (size.sizeSqft > 3000 ? 0.1 : 0));
      const fbrValuationZone = requireDefined(
        FBR_ZONES[c % FBR_ZONES.length],
        "fbr zone",
      );

      const category = await prisma.inventoryCategory.create({
        data: {
          societyId: society.id,
          slug: slugify(`${phase} ${block} ${size.sizeLabel} ${plotType} ${c}`),
          phase,
          block,
          plotType,
          sizeLabel: size.sizeLabel,
          sizeSqft: size.sizeSqft,
          pricePerSqft: new Prisma.Decimal(pricePerSqftRupees.toFixed(2)),
          totalUnits: 40,
          availableUnits: 40,
          allocationStrategy: c % 3 === 0 ? "BALLOT" : "FIFO",
          fbrValuationZone,
        },
      });

      const planSpecs = [
        {
          label: "Lump Sum (5% discount)",
          downPaymentPct: "100.00",
          installmentCount: 0,
          installmentInterval: "lump-sum",
        },
        {
          label: "2-Year Installments",
          downPaymentPct: "25.00",
          installmentCount: 8,
          installmentInterval: "quarterly",
        },
        {
          label: "3-Year Installments",
          downPaymentPct: "20.00",
          installmentCount: 36,
          installmentInterval: "monthly",
        },
      ];
      const planCount = 2 + (c % 2); // 2 or 3 plans per category
      const paymentPlanIds: string[] = [];
      for (const plan of planSpecs.slice(0, planCount)) {
        const created = await prisma.paymentPlan.create({
          data: {
            categoryId: category.id,
            label: plan.label,
            downPaymentPct: new Prisma.Decimal(plan.downPaymentPct),
            installmentCount: plan.installmentCount,
            installmentInterval: plan.installmentInterval,
          },
        });
        paymentPlanIds.push(created.id);
      }

      const plotIds: string[] = [];
      for (let p = 0; p < 6; p += 1) {
        const plot = await prisma.plot.create({
          data: {
            categoryId: category.id,
            serialNo: `${spec.slug}-${category.id.slice(-4)}-${String(p + 1).padStart(3, "0")}`,
            plotNo: `${block.replace("Block ", "")}-${100 + p}`,
            status: "AVAILABLE",
          },
        });
        plotIds.push(plot.id);
      }

      categories.push({
        id: category.id,
        societyId: society.id,
        plotType,
        sizeSqft: size.sizeSqft,
        pricePerSqftRupees,
        fbrValuationZone,
        paymentPlanIds,
        plotIds,
        nextPlotIndex: 0,
      });
    }

    seededSocieties.push({
      id: society.id,
      adminUserId: admin.id,
      categories,
    });
  }

  // ── Dealers ──────────────────────────────────────────────────────
  const dealerProfiles: { id: string; userId: string }[] = [];
  for (let d = 0; d < 9; d += 1) {
    userSeq += 1;
    const isVerified = d % 3 !== 0; // ~2/3 verified, ~1/3 pending
    const dealerUser = await prisma.user.create({
      data: {
        name: `Dealer ${d + 1} (${["Estate", "Properties", "Marketing", "Associates"][d % 4]})`,
        phone: fakePhone(userSeq),
        email: `dealer${d + 1}@partners.sectoria.pk`,
        role: UserRole.DEALER_PARTNER,
        atlStatus: requireDefined(ATL_CYCLE[d % ATL_CYCLE.length], "atl"),
        nadraVerified: true,
        cnicEncrypted: encrypt(fakeCnic(userSeq)),
        ntnEncrypted: encrypt(fakeNtn(userSeq)),
      },
    });
    const profile = await prisma.dealerProfile.create({
      data: {
        userId: dealerUser.id,
        slug: slugify(`dealer-${d + 1}-${["estate", "properties", "marketing", "associates"][d % 4]}`),
        agencyName: `${["Skyline", "Premier", "Metro", "Capital", "Pioneer"][d % 5]} ${["Estate", "Properties", "Marketing", "Associates"][d % 4]}`,
        dnfbpCertNumber: isVerified ? `DNFBP-${2025}-${4000 + d}` : null,
        dnfbpVerified: isVerified,
        completedDeals: isVerified ? (d * 3) % 25 : 0,
      },
    });
    dealerProfiles.push({ id: profile.id, userId: dealerUser.id });
  }

  // ── Partner authorizations (link dealers to societies) ───────────
  for (const [i, dealer] of dealerProfiles.entries()) {
    const society = requireDefined(
      seededSocieties[i % seededSocieties.length],
      "society for authorization",
    );
    const restrictToCategory = i % 2 === 0;
    await prisma.societyPartnerAuthorization.create({
      data: {
        societyId: society.id,
        dealerId: dealer.id,
        categoryId: restrictToCategory
          ? requireDefined(society.categories[0], "category").id
          : null,
        commissionSplitPct: new Prisma.Decimal(
          (2 + (i % 3)).toFixed(2), // 2.00–4.00 %
        ),
        status: i === dealerProfiles.length - 1 ? "REVOKED" : "ACTIVE",
      },
    });
  }

  // ── Buyers ───────────────────────────────────────────────────────
  const buyers: { id: string; atlStatus: AtlStatusType }[] = [];
  for (let b = 0; b < 18; b += 1) {
    userSeq += 1;
    const atlStatus = requireDefined(ATL_CYCLE[b % ATL_CYCLE.length], "atl");
    const isFiler = atlStatus === AtlStatus.FILER;
    const nadraVerified = b % 4 !== 0; // most buyers verified
    const buyer = await prisma.user.create({
      data: {
        name: `Buyer ${b + 1}`,
        phone: fakePhone(userSeq),
        email: b % 2 === 0 ? `buyer${b + 1}@example.pk` : null,
        role: UserRole.BUYER,
        atlStatus,
        atlVerifiedAt: isFiler ? new Date(SEED_EPOCH) : null,
        nadraVerified,
        cnicEncrypted: nadraVerified ? encrypt(fakeCnic(userSeq)) : null,
        ntnEncrypted: isFiler ? encrypt(fakeNtn(userSeq)) : null,
      },
    });
    buyers.push({ id: buyer.id, atlStatus });
  }

  // ── Bookings across every escrow state, with ledger events ───────
  const allCategories = seededSocieties.flatMap((s) =>
    s.categories.map((category) => ({
      category,
      adminUserId: s.adminUserId,
    })),
  );

  let ledgerCount = 0;
  const completedBookings: {
    bookingId: string;
    buyerId: string;
    societyId: string;
    dealerUserId: string | null;
  }[] = [];

  for (const [i, targetState] of BOOKING_TARGET_STATES.entries()) {
    const buyer = requireDefined(buyers[i % buyers.length], "buyer");
    const { category, adminUserId } = requireDefined(
      allCategories[i % allCategories.length],
      "category for booking",
    );
    const paymentPlanId = requireDefined(
      category.paymentPlanIds[i % category.paymentPlanIds.length],
      "payment plan",
    );
    const dealer =
      i % 2 === 0 ? requireDefined(dealerProfiles[i % dealerProfiles.length], "dealer") : null;

    // Real tax snapshot via the production tax engine (max of sale/FBR value).
    const salePriceRupees = pkrAmountSchema.parse(
      Math.round(category.sizeSqft * category.pricePerSqftRupees),
    );
    // FBR table value is resolved from the category's valuation zone via the
    // same domain lookup the booking flow uses — never a re-implemented formula.
    const fbrTableValueRupees =
      lookupFbrValuation({
        zone: category.fbrValuationZone,
        plotType: category.plotType,
        sizeSqft: category.sizeSqft,
      }) ?? salePriceRupees;
    const taxBreakdown = calculateTransferTax({
      salePrice: salePriceRupees,
      fbrTableValue: fbrTableValueRupees,
      sellerAtlStatus: AtlStatus.FILER,
      buyerAtlStatus: buyer.atlStatus,
      plotType: category.plotType,
    });

    const booking = await prisma.booking.create({
      data: {
        buyerId: buyer.id,
        categoryId: category.id,
        paymentPlanId,
        dealerId: dealer?.id ?? null,
        status: EscrowState.BOOKING_TOKEN_PAID,
        taxBreakdown: asJson(taxBreakdown),
        createdAt: new Date(SEED_EPOCH + i * 60 * 60 * 1000),
      },
    });
    const bookingId = idSchema.parse(booking.id);

    const ledgerEvents: LedgerEvent[] = [];

    // 1) Booking created — the buyer is the actor.
    ledgerEvents.push(
      createLedgerEvent({
        id: idSchema.parse(randomUUID()),
        type: LedgerEventType.BOOKING_CREATED,
        entityId: bookingId,
        bookingId,
        payload: {
          categoryId: category.id,
          paymentPlanId,
          taxTotalRupees: taxBreakdown.total,
        },
        actor: { actorId: idSchema.parse(buyer.id), actorRole: UserRole.BUYER },
        createdAt: nextTimestamp(),
      }),
    );

    // 2) Walk the escrow state machine to the target state (pure domain logic),
    //    recording an ESCROW_TRANSITIONED ledger event per legal transition.
    let currentState: EscrowStateType = EscrowState.BOOKING_TOKEN_PAID;
    const escrowEvents: EscrowEvent[] = [];
    for (const action of actionsToReach(targetState)) {
      const result = transitionEscrowState({
        currentState,
        action,
        bookingId,
        occurredAt: nextTimestamp(),
      });
      currentState = result.nextState;
      escrowEvents.push(result.event);
      ledgerEvents.push(
        createLedgerEvent({
          id: idSchema.parse(randomUUID()),
          type: LedgerEventType.ESCROW_TRANSITIONED,
          entityId: bookingId,
          bookingId,
          payload: {
            action: result.event.action,
            fromState: result.event.fromState,
            toState: result.event.toState,
          },
          actor: {
            actorId: idSchema.parse(adminUserId),
            actorRole: UserRole.SOCIETY_ADMIN,
          },
          createdAt: result.event.occurredAt,
        }),
      );
    }

    // 3) Persist the final booking status.
    if (currentState !== EscrowState.BOOKING_TOKEN_PAID) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: currentState },
      });
    }

    // 4) Allocate a plot for any booking that holds one in its final state.
    if (PLOT_HELD_STATES.has(targetState)) {
      const plotId = requireDefined(
        category.plotIds[category.nextPlotIndex],
        "plot for allocation",
      );
      category.nextPlotIndex += 1;
      const plotStatus = TITLE_TRANSFERRED_STATES.has(targetState)
        ? "TRANSFERRED"
        : "ALLOCATED";
      await prisma.plot.update({
        where: { id: plotId },
        data: { status: plotStatus, bookingId: booking.id },
      });
      await prisma.inventoryCategory.update({
        where: { id: category.id },
        data: { availableUnits: { decrement: 1 } },
      });
      ledgerEvents.push(
        createLedgerEvent({
          id: idSchema.parse(randomUUID()),
          type: LedgerEventType.PLOT_ALLOCATED,
          entityId: idSchema.parse(plotId),
          bookingId,
          payload: { plotId, strategy: "FIFO" },
          actor: {
            actorId: idSchema.parse(adminUserId),
            actorRole: UserRole.SOCIETY_ADMIN,
          },
          createdAt: nextTimestamp(),
        }),
      );
    }

    // 5) Document issuance + commission release get their own audit events.
    if (TITLE_TRANSFERRED_STATES.has(targetState)) {
      ledgerEvents.push(
        createLedgerEvent({
          id: idSchema.parse(randomUUID()),
          type: LedgerEventType.DOCUMENT_ISSUED,
          entityId: bookingId,
          bookingId,
          payload: { documentType: "PLRA_TRANSFER_CERTIFICATE" },
          actor: {
            actorId: idSchema.parse(adminUserId),
            actorRole: UserRole.SOCIETY_ADMIN,
          },
          createdAt: nextTimestamp(),
        }),
      );
    }
    if (targetState === EscrowState.COMMISSION_RELEASED) {
      ledgerEvents.push(
        createLedgerEvent({
          id: idSchema.parse(randomUUID()),
          type: LedgerEventType.COMMISSION_RELEASED,
          entityId: bookingId,
          bookingId,
          payload: { dealerId: dealer?.id ?? null },
          actor: { actorId: idSchema.parse(superAdmin.id), actorRole: UserRole.SUPER_ADMIN },
          createdAt: nextTimestamp(),
        }),
      );
      completedBookings.push({
        bookingId: booking.id,
        buyerId: buyer.id,
        societyId: category.societyId,
        dealerUserId: dealer?.userId ?? null,
      });
    }

    // Persist all ledger events as INSERT-only rows (the same way production
    // does — through the domain builder above, never hand-rolled here).
    for (const event of ledgerEvents) {
      await prisma.ledgerEvent.create({
        data: {
          id: event.id,
          type: event.type,
          entityId: event.entityId,
          bookingId: event.bookingId ?? null,
          payload: asJson(event.payload),
          actorId: event.actorId ?? null,
          actorRole: event.actorRole ?? null,
          createdAt: new Date(event.createdAt),
        },
      });
      ledgerCount += 1;
    }
  }

  // ── Reviews — ONLY against bookings that actually completed ──────
  const reviewComments = [
    "Smooth transfer process, documents issued on time.",
    "Verified society, exactly as advertised. Highly recommend.",
    "Dealer was responsive throughout the booking.",
    "Possession handed over without the usual delays.",
  ];
  for (const [i, completed] of completedBookings.entries()) {
    const author = requireDefined(buyers[(i + 1) % buyers.length], "review author");
    // Review about the society.
    await prisma.review.create({
      data: {
        authorId: completed.buyerId,
        subjectSocietyId: completed.societyId,
        bookingId: completed.bookingId,
        rating: 5 - (i % 2),
        comment: requireDefined(reviewComments[i % reviewComments.length], "comment"),
      },
    });
    // If a dealer was involved, a review about the dealer too.
    if (completed.dealerUserId !== null) {
      await prisma.review.create({
        data: {
          authorId: author.id,
          subjectUserId: completed.dealerUserId,
          bookingId: completed.bookingId,
          rating: 4 + (i % 2),
          comment: "Professional and transparent dealer.",
        },
      });
    }
  }

  const counts = {
    societies: await prisma.society.count(),
    categories: await prisma.inventoryCategory.count(),
    paymentPlans: await prisma.paymentPlan.count(),
    plots: await prisma.plot.count(),
    dealers: await prisma.dealerProfile.count(),
    buyers: await prisma.user.count({ where: { role: UserRole.BUYER } }),
    bookings: await prisma.booking.count(),
    completedBookings: completedBookings.length,
    reviews: await prisma.review.count(),
    ledgerEvents: ledgerCount,
  };
  console.log("Seed complete:", JSON.stringify(counts, null, 2));
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
