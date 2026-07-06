/**
 * Seed script for local development and demos.
 *
 * Generates realistic Pakistani-context data (real cities, valid-format CNIC/NTN
 * patterns, plausible PKR amounts) per Section 10 of the build prompt:
 *   - 6 societies (including Urban City Lahore benchmark) across Lahore, Islamabad, Karachi
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
  LeadSource,
  LeadStatus,
  QuoteStatus,
  QuotePaymentType,
  QuotePaymentStatus,
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
import {
  seedUrbanCityDevelopers,
  seedUrbanCityLahore,
} from "./seed-urban-city-lahore.js";
import { societyCardHeroUrl } from "./fixtures/society-card-images.js";

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
  readonly totalLandKanal: number;
  readonly developedLandKanal: number;
  readonly bookingStatus: "OPEN" | "CLOSED" | "UPCOMING";
  readonly addressLine: string;
  readonly district: string;
  readonly withBoundary?: boolean;
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
    totalLandKanal: 4500,
    developedLandKanal: 3825,
    bookingStatus: "OPEN",
    addressLine: "Main Boulevard, DHA Phase 6",
    district: "Lahore Cantonment",
    withBoundary: true,
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
    totalLandKanal: 6000,
    developedLandKanal: 3600,
    bookingStatus: "OPEN",
    addressLine: "Bahria Town Main Gate, Raiwind Road",
    district: "Raiwind",
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
    totalLandKanal: 8000,
    developedLandKanal: 3600,
    bookingStatus: "UPCOMING",
    addressLine: "M-2 Motorway, Near New Islamabad Airport",
    district: "Attock",
    withBoundary: true,
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
    totalLandKanal: 3200,
    developedLandKanal: 2880,
    bookingStatus: "OPEN",
    addressLine: "DHA Phase 2, G.T. Road",
    district: "Islamabad",
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
    totalLandKanal: 10000,
    developedLandKanal: 3000,
    bookingStatus: "CLOSED",
    addressLine: "Super Highway, Bahria Town Karachi",
    district: "Malir",
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

/** Approximate square boundary (~2 km) for map overlay demos. */
function boundaryAround(lat: number, lng: number): Prisma.InputJsonValue {
  const delta = 0.009;
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - delta, lat - delta],
        [lng + delta, lat - delta],
        [lng + delta, lat + delta],
        [lng - delta, lat + delta],
        [lng - delta, lat - delta],
      ],
    ],
  };
}

const SOCIETY_UPDATE_TEMPLATES = [
  {
    category: "NOC" as const,
    title: "NOC renewed by development authority",
    body: "The society's No Objection Certificate has been renewed for the current fiscal year. Reference numbers are listed in the compliance section.",
  },
  {
    category: "POSSESSION" as const,
    title: "Possession started in Phase 2",
    body: "Physical possession has commenced for Phase 2 residential blocks. Buyers with fully paid bookings may schedule handover through Sectoria.",
  },
  {
    category: "BOOKING" as const,
    title: "New inventory released for booking",
    body: "Additional residential and commercial categories are now open for booking through Sectoria's verified escrow flow.",
  },
  {
    category: "DEVELOPMENT" as const,
    title: "Road infrastructure milestone completed",
    body: "Main boulevard carpeting and underground utilities have been completed ahead of schedule in the latest development phase.",
  },
  {
    category: "LICENSE" as const,
    title: "Commercial license approved",
    body: "The society has received commercial development license approval for the designated commercial hub zone.",
  },
] as const;

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
       "Article","SocietyMilestone","NearbyLandmark","SocietyHighlight",
       "AmenityFeature","SocietyDocument","SocietyMedia","DeveloperProject",
       "Developer","FulfillmentOrder","QuotePayment","Quote","DealerNetSheet","Lead",
       "LedgerEvent","Review","SocietyPartnerAuthorization","Plot",
       "Booking","PaymentPlan","InventoryCategory","DealerProfile",
       "User","SocietyUpdate","Society"
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

  const salesAdvisor = await prisma.user.create({
    data: {
      name: "Sectoria Sales Advisor",
      phone: fakePhone(2),
      email: "advisor@sectoria.pk",
      role: UserRole.SALES_ADVISOR,
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
        heroImageUrl: societyCardHeroUrl(spec.slug),
        addressLine: spec.addressLine,
        district: spec.district,
        totalLandKanal: new Prisma.Decimal(spec.totalLandKanal.toFixed(2)),
        developedLandKanal: new Prisma.Decimal(spec.developedLandKanal.toFixed(2)),
        boundaryGeoJson: spec.withBoundary
          ? boundaryAround(spec.latitude, spec.longitude)
          : Prisma.JsonNull,
        bookingStatus: spec.bookingStatus,
        bookingOpensAt:
          spec.bookingStatus === "UPCOMING"
            ? new Date("2026-08-01T00:00:00.000Z")
            : null,
        bookingClosesAt:
          spec.bookingStatus === "CLOSED"
            ? new Date("2026-05-15T00:00:00.000Z")
            : null,
        // M0.1: the demo societies are live in the marketplace. Public reads are
        // filtered to PUBLISHED, so a DRAFT here would make them disappear.
        publishStatus: "PUBLISHED",
        publishedAt: new Date(SEED_EPOCH),
        createdById: superAdmin.id,
      },
    });

    for (let u = 0; u < 3; u += 1) {
      const template = requireDefined(
        SOCIETY_UPDATE_TEMPLATES[(societyIndex + u) % SOCIETY_UPDATE_TEMPLATES.length],
        "society update template",
      );
      await prisma.societyUpdate.create({
        data: {
          societyId: society.id,
          title: template.title,
          body: template.body,
          category: template.category,
          publishedAt: new Date(SEED_EPOCH + (societyIndex * 3 + u) * 86400000),
          isPublished: true,
        },
      });
    }

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
    const pendingAdminReview = d === 2; // one dealer awaiting platform sign-off
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
        dnfbpCertNumber: isVerified
          ? `DNFBP-${2025}-${4000 + d}`
          : pendingAdminReview
            ? `DNFBP-${2025}-${4999 + d}`
            : null,
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

  // ── Concierge CRM seed (ADR-007) ─────────────────────────────────
  const dhaSociety = requireDefined(seededSocieties[0], "dha society");
  const dhaCategory = requireDefined(dhaSociety.categories[1], "dha category");
  const firstDealer = requireDefined(dealerProfiles[0], "first dealer");
  const sampleBuyer = requireDefined(buyers[0], "sample buyer");

  const listPricePkr = Math.round(
    dhaCategory.sizeSqft * dhaCategory.pricePerSqftRupees,
  );
  const dealerNetPkr = Math.round(listPricePkr * 0.96);
  const quotedPricePkr = Math.round(listPricePkr * 0.98);
  const spreadPkr = quotedPricePkr - dealerNetPkr;
  const tokenAmountPkr = Math.round(quotedPricePkr * 0.1);

  await prisma.dealerNetSheet.create({
    data: {
      dealerId: firstDealer.id,
      categoryId: dhaCategory.id,
      netPricePkr: dealerNetPkr,
      paymentPlanTerms: "20% down, 36 monthly installments",
      refreshedAt: new Date(SEED_EPOCH),
    },
  });

  const sampleLead = await prisma.lead.create({
    data: {
      name: "Sample Concierge Buyer",
      phone: fakePhone(999),
      email: "concierge-buyer@example.pk",
      societyIds: [dhaSociety.id],
      categoryId: dhaCategory.id,
      budgetPkr: quotedPricePkr,
      paymentPlanPreference: "3-year installments",
      source: LeadSource.COMPARE,
      status: LeadStatus.QUOTED,
      assignedAdvisorId: salesAdvisor.id,
      buyerUserId: sampleBuyer.id,
    },
  });

  const quoteValidUntil = new Date(Date.now() + 72 * 60 * 60 * 1000);

  await prisma.quote.create({
    data: {
      leadId: sampleLead.id,
      societyId: dhaSociety.id,
      categoryId: dhaCategory.id,
      dealerId: firstDealer.id,
      dealerNetPkr,
      quotedPricePkr,
      spreadPkr,
      tokenAmountPkr,
      validUntil: quoteValidUntil,
      status: QuoteStatus.SENT,
      paymentPlanLabel: "3-Year Installments",
      createdById: salesAdvisor.id,
      buyerUserId: sampleBuyer.id,
    },
  });

  // Second buyer fixture: accepted quote with token paid (enables ops "mark deal won" demo).
  const secondBuyer = requireDefined(buyers[1], "second buyer");
  const acceptedQuote = await prisma.quote.create({
    data: {
      leadId: sampleLead.id,
      societyId: dhaSociety.id,
      categoryId: dhaCategory.id,
      dealerId: firstDealer.id,
      dealerNetPkr,
      quotedPricePkr,
      spreadPkr,
      tokenAmountPkr,
      validUntil: quoteValidUntil,
      status: QuoteStatus.ACCEPTED,
      paymentPlanLabel: "3-Year Installments",
      installmentsDirect: true,
      createdById: salesAdvisor.id,
      buyerUserId: secondBuyer.id,
    },
  });

  await prisma.quotePayment.create({
    data: {
      quoteId: acceptedQuote.id,
      type: QuotePaymentType.TOKEN,
      amountPkr: tokenAmountPkr,
      status: QuotePaymentStatus.CONFIRMED,
      externalEventId: randomUUID(),
    },
  });

  // ── Society Profile V2 fixtures (M1–M8) ───────────────────────────
  // Platform-curated developers with track records.
  const bahriaDeveloper = await prisma.developer.create({
    data: {
      slug: "bahria-town",
      name: "Bahria Town (Pvt) Ltd",
      description:
        "One of Pakistan's largest private housing developers, known for gated communities with world-class amenities across Lahore, Karachi, and Rawalpindi.",
      logoKey: "developers/bahria-town/logo.png",
      websiteUrl: "https://www.bahriatown.com",
      foundedYear: 1997,
    },
  });
  await prisma.developerProject.createMany({
    data: [
      {
        developerId: bahriaDeveloper.id,
        name: "Bahria Town Rawalpindi",
        description: "Flagship gated community near the GT Road interchange.",
        city: "Rawalpindi",
        year: 2005,
        sortOrder: 0,
      },
      {
        developerId: bahriaDeveloper.id,
        name: "Bahria Town Lahore",
        description: "6000+ kanal master-planned community on Raiwind Road.",
        city: "Lahore",
        year: 2012,
        sortOrder: 1,
      },
      {
        developerId: bahriaDeveloper.id,
        name: "Bahria Town Karachi",
        description: "Mega project on the Super Highway with commercial hub.",
        city: "Karachi",
        year: 2014,
        sortOrder: 2,
      },
    ],
  });

  const dhaDeveloper = await prisma.developer.create({
    data: {
      slug: "dha-pakistan",
      name: "Defence Housing Authority",
      description:
        "Government-backed housing authority delivering premium residential and commercial plots across Pakistan's major cities.",
      logoKey: "developers/dha-pakistan/logo.png",
      websiteUrl: "https://www.dha.com.pk",
      foundedYear: 1978,
    },
  });
  await prisma.developerProject.createMany({
    data: [
      {
        developerId: dhaDeveloper.id,
        name: "DHA Lahore Phase 6",
        city: "Lahore",
        year: 2010,
        sortOrder: 0,
      },
      {
        developerId: dhaDeveloper.id,
        name: "DHA Islamabad Phase 2",
        city: "Islamabad",
        year: 2015,
        sortOrder: 1,
      },
    ],
  });

  const futureDeveloper = await prisma.developer.create({
    data: {
      slug: "future-holdings",
      name: "Future Holdings Developments",
      description:
        "Developer behind Capital Smart City — Pakistan's first smart city on the M-2 Motorway corridor.",
      logoKey: "developers/future-holdings/logo.png",
      websiteUrl: "https://www.capitalsmartcity.pk",
      foundedYear: 2016,
    },
  });
  await prisma.developerProject.createMany({
    data: [
      {
        developerId: futureDeveloper.id,
        name: "Capital Smart City (Phase 1)",
        city: "Islamabad",
        year: 2019,
        sortOrder: 0,
      },
    ],
  });

  const urbanCityDevs = await seedUrbanCityDevelopers(prisma);

  /** Maps society slug → developer for linking. */
  const developerBySlug: Record<string, string> = {
    "dha-lahore": dhaDeveloper.id,
    "dha-islamabad": dhaDeveloper.id,
    "bahria-town-lahore": bahriaDeveloper.id,
    "bahria-town-karachi": bahriaDeveloper.id,
    "capital-smart-city": futureDeveloper.id,
  };

  const profileUrlBySlug: Record<string, { virtualTourUrl?: string; promoVideoUrl?: string }> = {
    "dha-lahore": {
      virtualTourUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      promoVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
    "bahria-town-lahore": {
      promoVideoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    },
    "capital-smart-city": {
      virtualTourUrl: "https://my.matterport.com/show/?m=example",
    },
  };

  for (const [societyIndex, seeded] of seededSocieties.entries()) {
    const spec = requireDefined(SOCIETY_SPECS[societyIndex], "society spec");
    const profileUrls = profileUrlBySlug[spec.slug] ?? {};

    await prisma.society.update({
      where: { id: seeded.id },
      data: {
        developerId: developerBySlug[spec.slug] ?? null,
        virtualTourUrl: profileUrls.virtualTourUrl ?? null,
        promoVideoUrl: profileUrls.promoVideoUrl ?? null,
      },
    });

    // M1 — media
    await prisma.societyMedia.createMany({
      data: [
        {
          societyId: seeded.id,
          kind: "HERO",
          storageKey: societyCardHeroUrl(spec.slug),
          alt: `${spec.name} aerial view`,
          sortOrder: 0,
          width: 1920,
          height: 1080,
        },
        {
          societyId: seeded.id,
          kind: "GALLERY",
          storageKey: `societies/${spec.slug}/gallery-1.jpg`,
          alt: `${spec.name} main boulevard`,
          caption: "Main Boulevard",
          sortOrder: 0,
          width: 1600,
          height: 900,
        },
        {
          societyId: seeded.id,
          kind: "GALLERY",
          storageKey: `societies/${spec.slug}/gallery-2.jpg`,
          alt: `${spec.name} community park`,
          caption: "Community Park",
          sortOrder: 1,
          width: 1600,
          height: 900,
        },
        {
          societyId: seeded.id,
          kind: "PROGRESS",
          storageKey: `societies/${spec.slug}/progress-2024-03.jpg`,
          alt: "Development progress — March 2024",
          capturedAt: new Date("2024-03-15T00:00:00.000Z"),
          sortOrder: 0,
          width: 1200,
          height: 800,
        },
        {
          societyId: seeded.id,
          kind: "PROGRESS",
          storageKey: `societies/${spec.slug}/progress-2025-01.jpg`,
          alt: "Development progress — January 2025",
          capturedAt: new Date("2025-01-20T00:00:00.000Z"),
          sortOrder: 1,
          width: 1200,
          height: 800,
        },
        {
          societyId: seeded.id,
          kind: "FLOORPLAN",
          storageKey: `societies/${spec.slug}/master-layout.jpg`,
          alt: `${spec.name} master layout`,
          sortOrder: 0,
          width: 1400,
          height: 1000,
        },
      ],
    });

    // M2 — documents
    await prisma.societyDocument.createMany({
      data: [
        {
          societyId: seeded.id,
          kind: "MASTER_PLAN",
          title: "Master Plan",
          storageKey: `societies/${spec.slug}/master-plan.pdf`,
          fileSize: 4_500_000,
          contentType: "application/pdf",
          isPublic: true,
          sortOrder: 0,
        },
        {
          societyId: seeded.id,
          kind: "BROCHURE",
          title: "Project Brochure",
          storageKey: `societies/${spec.slug}/brochure.pdf`,
          fileSize: 2_800_000,
          contentType: "application/pdf",
          isPublic: true,
          sortOrder: 1,
        },
        {
          societyId: seeded.id,
          kind: "PAYMENT_PLAN",
          title: "Payment Plan Schedule",
          storageKey: `societies/${spec.slug}/payment-plan.pdf`,
          fileSize: 350_000,
          contentType: "application/pdf",
          isPublic: true,
          sortOrder: 2,
        },
        {
          societyId: seeded.id,
          kind: "LOP",
          title: "Letter of Permission",
          storageKey: `societies/${spec.slug}/lop.pdf`,
          fileSize: 520_000,
          contentType: "application/pdf",
          isPublic: false,
          sortOrder: 3,
        },
        {
          societyId: seeded.id,
          kind: "NOC",
          title: "No Objection Certificate",
          storageKey: `societies/${spec.slug}/noc.pdf`,
          fileSize: 480_000,
          contentType: "application/pdf",
          isPublic: false,
          sortOrder: 4,
        },
      ],
    });

    // M3 — rich amenities & highlights
    await prisma.amenityFeature.createMany({
      data: [
        {
          societyId: seeded.id,
          title: "Gated Security",
          description:
            "24/7 manned entry points with CCTV surveillance across all phases.",
          icon: "shield-check",
          sortOrder: 0,
        },
        {
          societyId: seeded.id,
          title: "Underground Utilities",
          description:
            "All electricity, gas, and sewerage lines laid underground for a clean streetscape.",
          icon: "zap",
          sortOrder: 1,
        },
        {
          societyId: seeded.id,
          title: "Grand Mosque",
          description:
            "Central Jamia mosque with capacity for 5,000 worshippers.",
          icon: "building",
          sortOrder: 2,
        },
        {
          societyId: seeded.id,
          title: "Commercial Hub",
          description:
            "Designated commercial zones with retail, dining, and service outlets.",
          icon: "store",
          sortOrder: 3,
        },
      ],
    });

    await prisma.societyHighlight.createMany({
      data: [
        {
          societyId: seeded.id,
          label: "Total Area",
          value: `${spec.totalLandKanal.toLocaleString("en-PK")} kanal`,
          icon: "map",
          sortOrder: 0,
        },
        {
          societyId: seeded.id,
          label: "Development",
          value: `${spec.developmentPct}% complete`,
          icon: "trending-up",
          sortOrder: 1,
        },
        {
          societyId: seeded.id,
          label: "Authority",
          value: spec.authority,
          icon: "badge-check",
          sortOrder: 2,
        },
      ],
    });

    // M4 — nearby landmarks
    const landmarkFixtures: ReadonlyArray<{
      name: string;
      category: "AIRPORT" | "HOSPITAL" | "SCHOOL" | "MOSQUE" | "INTERCHANGE" | "HIGHWAY";
      distanceKm: string;
      driveTimeMins: number;
    }> =
      spec.city === "Lahore"
        ? [
            { name: "Allama Iqbal International Airport", category: "AIRPORT", distanceKm: "18.5", driveTimeMins: 25 },
            { name: "Shaukat Khanum Memorial Hospital", category: "HOSPITAL", distanceKm: "8.2", driveTimeMins: 15 },
            { name: "Lahore Grammar School", category: "SCHOOL", distanceKm: "3.1", driveTimeMins: 8 },
            { name: "Raiwind Road Interchange", category: "INTERCHANGE", distanceKm: "2.0", driveTimeMins: 5 },
          ]
        : spec.city === "Islamabad"
          ? [
              { name: "New Islamabad International Airport", category: "AIRPORT", distanceKm: "12.0", driveTimeMins: 15 },
              { name: "Shifa International Hospital", category: "HOSPITAL", distanceKm: "22.0", driveTimeMins: 30 },
              { name: "M-2 Motorway", category: "HIGHWAY", distanceKm: "1.5", driveTimeMins: 3 },
            ]
          : [
              { name: "Jinnah International Airport", category: "AIRPORT", distanceKm: "35.0", driveTimeMins: 45 },
              { name: "Aga Khan University Hospital", category: "HOSPITAL", distanceKm: "20.0", driveTimeMins: 30 },
              { name: "Super Highway", category: "HIGHWAY", distanceKm: "0.5", driveTimeMins: 2 },
            ];

    await prisma.nearbyLandmark.createMany({
      data: landmarkFixtures.map((lm, idx) => ({
        societyId: seeded.id,
        name: lm.name,
        category: lm.category,
        distanceKm: new Prisma.Decimal(lm.distanceKm),
        driveTimeMins: lm.driveTimeMins,
        sortOrder: idx,
      })),
    });

    // M6 — milestone roadmap
    await prisma.societyMilestone.createMany({
      data: [
        {
          societyId: seeded.id,
          title: "NOC Approval",
          description: "No Objection Certificate granted by the development authority.",
          occurredOn: new Date("2022-06-01T00:00:00.000Z"),
          status: "COMPLETED",
          sortOrder: 0,
        },
        {
          societyId: seeded.id,
          title: "Infrastructure Phase 1",
          description: "Main boulevard, underground utilities, and drainage completed.",
          occurredOn: new Date("2023-09-15T00:00:00.000Z"),
          status: "COMPLETED",
          sortOrder: 1,
        },
        {
          societyId: seeded.id,
          title: "Possession — Phase 1 Blocks",
          description: "Physical possession commenced for early residential blocks.",
          occurredOn: new Date("2024-08-01T00:00:00.000Z"),
          status: "IN_PROGRESS",
          sortOrder: 2,
        },
        {
          societyId: seeded.id,
          title: "Commercial Hub Launch",
          description: "Commercial plots allocation and development.",
          occurredOn: new Date("2026-12-01T00:00:00.000Z"),
          status: "PLANNED",
          sortOrder: 3,
        },
      ],
    });
  }

  // Urban City Lahore — benchmark society profile with real website data (v2).
  const urbanCityResult = await seedUrbanCityLahore(prisma, {
    superAdminId: superAdmin.id,
    developerId: urbanCityDevs.urbanCityDeveloperId,
    userSeqStart: userSeq,
  });
  userSeq = urbanCityResult.nextUserSeq;
  seededSocieties.push(urbanCityResult.society);

  // M8 — blog articles
  await prisma.article.createMany({
    data: [
      {
        slug: "why-gated-communities-lahore-2026",
        title: "Why Gated Communities in Lahore Are the Smart Investment in 2026",
        excerpt:
          "LDA-approved societies with verified NOCs offer capital appreciation and lifestyle amenities that unplanned housing cannot match.",
        body: "## The Lahore housing market\n\nLahore's premium societies continue to outperform unplanned areas on both rental yield and capital gains.\n\n### What to look for\n\n- Verified NOC and LOP references\n- Developer track record\n- Infrastructure completion percentage",
        coverKey: "blog/gated-communities-lahore.jpg",
        authorName: "Sectoria Editorial",
        publishedAt: new Date("2026-02-15T00:00:00.000Z"),
        isPublished: true,
        societyId: seededSocieties[0]?.id ?? null,
      },
      {
        slug: "capital-smart-city-m2-corridor",
        title: "Capital Smart City and the M-2 Motorway Corridor",
        excerpt:
          "How Pakistan's first smart city leverages the Islamabad–Lahore motorway for connectivity and long-term value.",
        body: "## Location advantage\n\nCapital Smart City sits directly on the M-2 corridor, minutes from the new Islamabad airport.\n\n### Smart infrastructure\n\nUnderground utilities, fibre connectivity, and master-planned commercial zones.",
        coverKey: "blog/capital-smart-city.jpg",
        authorName: "Sectoria Editorial",
        publishedAt: new Date("2026-03-01T00:00:00.000Z"),
        isPublished: true,
        societyId: seededSocieties[2]?.id ?? null,
        developerId: futureDeveloper.id,
      },
      {
        slug: "draft-article-not-published",
        title: "Draft: Upcoming Society Spotlight",
        excerpt: "This article is intentionally unpublished for lifecycle testing.",
        body: "Draft content — should not appear on the public blog.",
        authorName: "Sectoria Editorial",
        isPublished: false,
      },
    ],
  });

  // ── One DRAFT society for the onboarding console (M0.3) ──────────
  // Intentionally incomplete (no LOP/NOC/hero/coordinates) so the console
  // shows a sub-100% completeness score and the publish gate blocks it.
  await prisma.society.create({
    data: {
      slug: "orchard-gardens-faisalabad",
      name: "Orchard Gardens (Draft)",
      city: "Faisalabad",
      citySlug: "faisalabad",
      authority: "FDA",
      description: "",
      hsmsLinked: false,
      verificationTier: "PENDING",
      developmentStage: "Planning",
      developmentPct: 0,
      bookingStatus: "UPCOMING",
      publishStatus: "DRAFT",
      createdById: superAdmin.id,
    },
  });

  const counts = {
    societies: await prisma.society.count(),
    draftSocieties: await prisma.society.count({
      where: { publishStatus: "DRAFT" },
    }),
    developers: await prisma.developer.count(),
    developerProjects: await prisma.developerProject.count(),
    societyMedia: await prisma.societyMedia.count(),
    societyDocuments: await prisma.societyDocument.count(),
    amenityFeatures: await prisma.amenityFeature.count(),
    societyHighlights: await prisma.societyHighlight.count(),
    nearbyLandmarks: await prisma.nearbyLandmark.count(),
    societyMilestones: await prisma.societyMilestone.count(),
    articles: await prisma.article.count(),
    publishedArticles: await prisma.article.count({ where: { isPublished: true } }),
    categories: await prisma.inventoryCategory.count(),
    paymentPlans: await prisma.paymentPlan.count(),
    plots: await prisma.plot.count(),
    dealers: await prisma.dealerProfile.count(),
    buyers: await prisma.user.count({ where: { role: UserRole.BUYER } }),
    bookings: await prisma.booking.count(),
    completedBookings: completedBookings.length,
    reviews: await prisma.review.count(),
    ledgerEvents: ledgerCount,
    leads: await prisma.lead.count(),
    quotes: await prisma.quote.count(),
    dealerNetSheets: await prisma.dealerNetSheet.count(),
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
