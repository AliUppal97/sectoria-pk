import type { PrismaClient } from "@sectoria/database";
import {
  attachProfileV2Models,
  createProfileV2Store,
  type ProfileV2Store,
} from "./in-memory-profile-v2.js";

/**
 * A tiny in-memory stand-in for the Prisma client, implementing only the model
 * methods the routers under test actually call. It exists so the API-layer
 * integration tests can exercise the real router → domain → persistence
 * composition **without** a live Postgres, while still proving the property that
 * matters most: `$transaction` is atomic. (This is an api-client test, not a
 * domain test — `testing.mdc`'s "domain tests never mock a database" rule scopes
 * to `packages/domain/*`; faking persistence is the correct move at this layer.)
 *
 * `$transaction(fn)` snapshots the whole store, runs `fn`, and on any thrown
 * error restores the snapshot — so a failure mid-transaction leaves no partial
 * writes, exactly like a rolled-back database transaction. That is what lets a
 * test force a ledger-insert failure and assert the escrow transition rolled
 * back with it, leaving no orphan event.
 */

export interface UserRow {
  id: string;
  role?: string;
  societyId?: string | null;
  atlStatus: string;
  nadraVerified: boolean;
  cnicEncrypted: string | null;
  ntnEncrypted: string | null;
  atlVerifiedAt: Date | null;
}

export interface SocietyRow {
  id: string;
  slug: string;
  name: string;
  city: string;
  citySlug: string;
  authority: string;
  verificationTier: string;
  description: string;
  amenities: string[];
  developmentStage: string;
  developmentPct: number;
  heroImageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  lopReferenceNo: string | null;
  nocReferenceNo: string | null;
  hsmsLinked: boolean;
  totalLandKanal: string | null;
  developedLandKanal: string | null;
  bookingStatus: string;
  publishStatus: string;
  publishedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
}

export interface ReviewRow {
  id: string;
  subjectSocietyId: string | null;
  subjectUserId: string | null;
  rating: number;
}

export interface CategoryRow {
  id: string;
  societyId: string;
  slug: string;
  phase: string;
  block: string;
  plotType: string;
  sizeLabel: string;
  sizeSqft: number;
  pricePerSqft: string;
  totalUnits: number;
  availableUnits: number;
  allocationStrategy: string;
  fbrValuationZone: string;
}

export interface PlotRow {
  id: string;
  categoryId: string;
  serialNo: string;
  plotNo: string | null;
  status: string;
  bookingId: string | null;
}

export interface PaymentPlanRow {
  id: string;
  categoryId: string;
  label: string;
  downPaymentPct: string;
  installmentCount: number;
  installmentInterval: string;
}

export interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  societyIds: string[];
  categoryId: string | null;
  budgetPkr: number | null;
  paymentPlanPreference: string | null;
  source: string;
  status: string;
  notes: string | null;
  buyerUserId: string | null;
  assignedAdvisorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuoteRow {
  id: string;
  leadId: string;
  societyId: string;
  categoryId: string;
  dealerId: string;
  dealerNetPkr: number;
  quotedPricePkr: number;
  spreadPkr: number;
  tokenAmountPkr: number;
  validUntil: Date;
  status: string;
  paymentPlanLabel: string | null;
  installmentsDirect: boolean;
  createdById: string;
  buyerUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotePaymentRow {
  id: string;
  quoteId: string;
  type: string;
  amountPkr: number;
  installmentIndex: number | null;
  status: string;
  externalEventId: string | null;
  createdAt: Date;
}

export interface DealerProfileRow {
  id: string;
  userId: string;
  slug: string;
  agencyName: string;
}

export interface DealerNetSheetRow {
  id: string;
  dealerId: string;
  categoryId: string;
  netPricePkr: number;
  paymentPlanTerms: string | null;
  refreshedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FulfillmentOrderRow {
  id: string;
  quoteId: string;
  dealerId: string;
  orderRef: string;
  status: string;
  plotRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingRow {
  id: string;
  buyerId: string;
  categoryId: string;
  paymentPlanId: string;
  dealerId: string | null;
  status: string;
  taxBreakdown: unknown;
  createdAt: Date;
}

export interface LedgerRow {
  id: string;
  type: string;
  entityId: string;
  bookingId: string | null;
  payload: unknown;
  actorId: string | null;
  actorRole: string | null;
  createdAt: Date;
}

/** The mutable state backing one fake client. */
export class Store {
  users = new Map<string, UserRow>();
  societies = new Map<string, SocietyRow>();
  categories = new Map<string, CategoryRow>();
  plots = new Map<string, PlotRow>();
  paymentPlans = new Map<string, PaymentPlanRow>();
  leads = new Map<string, LeadRow>();
  quotes = new Map<string, QuoteRow>();
  quotePayments = new Map<string, QuotePaymentRow>();
  dealerProfiles = new Map<string, DealerProfileRow>();
  dealerNetSheets = new Map<string, DealerNetSheetRow>();
  fulfillmentOrders = new Map<string, FulfillmentOrderRow>();
  bookings = new Map<string, BookingRow>();
  reviews = new Map<string, ReviewRow>();
  ledgerEvents = new Map<string, LedgerRow>();
  profileV2: ProfileV2Store = createProfileV2Store();

  /** Test hook: when set, every `ledgerEvent.create` throws to force a rollback. */
  failLedgerCreate = false;

  /**
   * Counts every model method invocation, so a test can assert an operation runs
   * a *bounded* number of queries rather than fanning out per row (M0.7).
   */
  dbCallCount = 0;

  private bookingCounter = 0;
  private societyCounter = 0;
  private quotePaymentCounter = 0;
  private leadCounter = 0;
  private quoteCounter = 0;
  private fulfillmentCounter = 0;
  private netSheetCounter = 0;

  nextQuotePaymentId(): string {
    this.quotePaymentCounter += 1;
    return `qp_${this.quotePaymentCounter}`;
  }

  nextBookingId(): string {
    this.bookingCounter += 1;
    return `bk_${this.bookingCounter}`;
  }

  nextSocietyId(): string {
    this.societyCounter += 1;
    return `soc_new_${this.societyCounter}`;
  }

  nextLeadId(): string {
    this.leadCounter += 1;
    return `lead_${this.leadCounter}`;
  }

  nextQuoteId(): string {
    this.quoteCounter += 1;
    return `quote_new_${this.quoteCounter}`;
  }

  nextFulfillmentId(): string {
    this.fulfillmentCounter += 1;
    return `fo_${this.fulfillmentCounter}`;
  }

  nextNetSheetId(): string {
    this.netSheetCounter += 1;
    return `dns_${this.netSheetCounter}`;
  }
}

type WhereId = { where: { id: string } };

function snapshot(store: Store): Map<string, unknown>[] {
  const clone = <V>(map: Map<string, V>): Map<string, V> =>
    new Map([...map].map(([k, v]) => [k, structuredClone(v)]));
  return [
    clone(store.users),
    clone(store.societies),
    clone(store.categories),
    clone(store.plots),
    clone(store.paymentPlans),
    clone(store.leads),
    clone(store.quotes),
    clone(store.quotePayments),
    clone(store.dealerProfiles),
    clone(store.dealerNetSheets),
    clone(store.fulfillmentOrders),
    clone(store.bookings),
    clone(store.reviews),
    clone(store.ledgerEvents),
    clone(store.profileV2.societyMedia),
    clone(store.profileV2.societyDocument),
    clone(store.profileV2.amenityFeature),
    clone(store.profileV2.societyHighlight),
    clone(store.profileV2.nearbyLandmark),
    clone(store.profileV2.developer),
    clone(store.profileV2.developerProject),
    clone(store.profileV2.societyMilestone),
    clone(store.profileV2.article),
  ];
}

function restore(store: Store, snap: Map<string, unknown>[]): void {
  const [
    users,
    societies,
    categories,
    plots,
    paymentPlans,
    leads,
    quotes,
    quotePayments,
    dealerProfiles,
    dealerNetSheets,
    fulfillmentOrders,
    bookings,
    reviews,
    ledger,
    societyMedia,
    societyDocument,
    amenityFeature,
    societyHighlight,
    nearbyLandmark,
    developer,
    developerProject,
    societyMilestone,
    article,
  ] = snap;
  store.users = users as Map<string, UserRow>;
  store.societies = societies as Map<string, SocietyRow>;
  store.categories = categories as Map<string, CategoryRow>;
  store.plots = plots as Map<string, PlotRow>;
  store.paymentPlans = paymentPlans as Map<string, PaymentPlanRow>;
  store.leads = leads as Map<string, LeadRow>;
  store.quotes = quotes as Map<string, QuoteRow>;
  store.quotePayments = quotePayments as Map<string, QuotePaymentRow>;
  store.dealerProfiles = dealerProfiles as Map<string, DealerProfileRow>;
  store.dealerNetSheets = dealerNetSheets as Map<string, DealerNetSheetRow>;
  store.fulfillmentOrders = fulfillmentOrders as Map<string, FulfillmentOrderRow>;
  store.bookings = bookings as Map<string, BookingRow>;
  store.reviews = reviews as Map<string, ReviewRow>;
  store.ledgerEvents = ledger as Map<string, LedgerRow>;
  store.profileV2.societyMedia = societyMedia as Map<
    string,
    import("./in-memory-profile-v2.js").SocietyMediaRow
  >;
  store.profileV2.societyDocument = societyDocument as Map<
    string,
    import("./in-memory-profile-v2.js").SocietyDocumentRow
  >;
  store.profileV2.amenityFeature = amenityFeature as Map<
    string,
    import("./in-memory-profile-v2.js").AmenityFeatureRow
  >;
  store.profileV2.societyHighlight = societyHighlight as Map<
    string,
    import("./in-memory-profile-v2.js").SocietyHighlightRow
  >;
  store.profileV2.nearbyLandmark = nearbyLandmark as Map<
    string,
    import("./in-memory-profile-v2.js").NearbyLandmarkRow
  >;
  store.profileV2.developer = developer as Map<
    string,
    import("./in-memory-profile-v2.js").DeveloperRow
  >;
  store.profileV2.developerProject = developerProject as Map<
    string,
    import("./in-memory-profile-v2.js").DeveloperProjectRow
  >;
  store.profileV2.societyMilestone = societyMilestone as Map<
    string,
    import("./in-memory-profile-v2.js").SocietyMilestoneRow
  >;
  store.profileV2.article = article as Map<
    string,
    import("./in-memory-profile-v2.js").ArticleRow
  >;
}

/** Evaluates a Prisma-style string filter (`contains` + `mode: "insensitive"`). */
function matchesStringFilter(value: string, filter: unknown): boolean {
  if (typeof filter === "string") return value === filter;
  if (filter !== null && typeof filter === "object") {
    const op = filter as { contains?: string; mode?: string };
    if (typeof op.contains === "string") {
      const haystack = op.mode === "insensitive" ? value.toLowerCase() : value;
      const needle =
        op.mode === "insensitive" ? op.contains.toLowerCase() : op.contains;
      return haystack.includes(needle);
    }
  }
  return true;
}

/** Minimal Prisma `where` matcher for the society directory/console queries. */
function matchesSocietyWhere(
  row: SocietyRow,
  where?: Record<string, unknown>,
): boolean {
  if (where === undefined) return true;
  for (const [key, condition] of Object.entries(where)) {
    if (key === "OR") {
      const clauses = condition as Record<string, unknown>[];
      if (!clauses.some((clause) => matchesSocietyWhere(row, clause))) {
        return false;
      }
      continue;
    }
    const value = (row as unknown as Record<string, unknown>)[key];
    if (typeof value === "string") {
      if (!matchesStringFilter(value, condition)) return false;
    } else if (value !== condition) {
      return false;
    }
  }
  return true;
}

/** Applies the subset of `orderBy` the society queries use. */
function sortSocieties(rows: SocietyRow[], orderBy: unknown): SocietyRow[] {
  const clauses = Array.isArray(orderBy)
    ? (orderBy as Record<string, "asc" | "desc">[])
    : orderBy !== undefined && orderBy !== null
      ? [orderBy as Record<string, "asc" | "desc">]
      : [];
  if (clauses.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const clause of clauses) {
      const [field, direction] = Object.entries(clause)[0] ?? [];
      if (field === undefined) continue;
      const av = (a as unknown as Record<string, unknown>)[field];
      const bv = (b as unknown as Record<string, unknown>)[field];
      const cmp =
        av instanceof Date && bv instanceof Date
          ? av.getTime() - bv.getTime()
          : String(av).localeCompare(String(bv));
      if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

/** Applies a Prisma-style numeric write (`5` or `{ decrement: 1 }`). */
function applyNumericWrite(current: number, write: unknown): number {
  if (typeof write === "number") return write;
  if (write !== null && typeof write === "object") {
    const op = write as { increment?: number; decrement?: number };
    if (typeof op.increment === "number") return current + op.increment;
    if (typeof op.decrement === "number") return current - op.decrement;
  }
  return current;
}

function buildClient(store: Store): PrismaClient {
  const client = {
    async $transaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
      const snap = snapshot(store);
      try {
        return await fn(client);
      } catch (error) {
        restore(store, snap);
        throw error;
      }
    },

    user: {
      findUnique: async (args: {
        where: { id: string };
        select?: Record<string, boolean>;
      }) => store.users.get(args.where.id) ?? null,
      update: async (args: WhereId & { data: Record<string, unknown> }) => {
        const row = store.users.get(args.where.id);
        if (row === undefined) throw new Error("user not found");
        Object.assign(row, args.data);
        return row;
      },
      updateMany: async (args: {
        where: { societyId?: string };
        data: Record<string, unknown>;
      }) => {
        let count = 0;
        for (const row of store.users.values()) {
          if (
            args.where.societyId === undefined ||
            (row as unknown as { societyId?: string | null }).societyId ===
              args.where.societyId
          ) {
            Object.assign(row, args.data);
            count += 1;
          }
        }
        return { count };
      },
    },

    society: {
      findMany: async (args?: {
        where?: Record<string, unknown>;
        orderBy?: unknown;
        take?: number;
        cursor?: { id: string };
        skip?: number;
        include?: { _count?: { select?: { users?: boolean } } };
      }) => {
        store.dbCallCount += 1;
        let rows = [...store.societies.values()].filter((row) =>
          matchesSocietyWhere(row, args?.where),
        );
        rows = sortSocieties(rows, args?.orderBy);
        if (args?.cursor !== undefined) {
          const index = rows.findIndex((row) => row.id === args.cursor?.id);
          if (index >= 0) rows = rows.slice(index + (args.skip ?? 0));
        }
        if (typeof args?.take === "number") rows = rows.slice(0, args.take);
        if (args?.include?._count?.select?.users) {
          return rows.map((row) => ({
            ...row,
            _count: {
              users: [...store.users.values()].filter(
                (u) => u.societyId === row.id,
              ).length,
            },
          }));
        }
        return rows;
      },
      findUnique: async (args: {
        where: { id?: string; slug?: string };
        select?: Record<string, boolean>;
      }) => {
        store.dbCallCount += 1;
        const row =
          args.where.id !== undefined
            ? (store.societies.get(args.where.id) ?? null)
            : ([...store.societies.values()].find(
                (s) => s.slug === args.where.slug,
              ) ?? null);
        return row;
      },
      create: async (args: { data: Record<string, unknown> }) => {
        store.dbCallCount += 1;
        const id = store.nextSocietyId();
        const row: SocietyRow = {
          id,
          slug: String(args.data.slug),
          name: String(args.data.name),
          city: String(args.data.city ?? ""),
          citySlug: String(args.data.citySlug),
          authority: String(args.data.authority),
          verificationTier: String(args.data.verificationTier ?? "PENDING"),
          description: String(args.data.description ?? ""),
          amenities: (args.data.amenities as string[] | undefined) ?? [],
          developmentStage: String(args.data.developmentStage ?? ""),
          developmentPct: Number(args.data.developmentPct ?? 0),
          heroImageUrl: (args.data.heroImageUrl as string | null) ?? null,
          latitude: (args.data.latitude as number | null) ?? null,
          longitude: (args.data.longitude as number | null) ?? null,
          lopReferenceNo: (args.data.lopReferenceNo as string | null) ?? null,
          nocReferenceNo: (args.data.nocReferenceNo as string | null) ?? null,
          hsmsLinked: Boolean(args.data.hsmsLinked ?? false),
          totalLandKanal: (args.data.totalLandKanal as string | null) ?? null,
          developedLandKanal:
            (args.data.developedLandKanal as string | null) ?? null,
          bookingStatus: String(args.data.bookingStatus ?? "OPEN"),
          publishStatus: String(args.data.publishStatus ?? "DRAFT"),
          publishedAt: (args.data.publishedAt as Date | null) ?? null,
          createdById: (args.data.createdById as string | null) ?? null,
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
        };
        store.societies.set(id, row);
        return row;
      },
      update: async (args: {
        where: { id?: string; slug?: string };
        data: Record<string, unknown>;
      }) => {
        store.dbCallCount += 1;
        const row =
          args.where.id !== undefined
            ? store.societies.get(args.where.id)
            : [...store.societies.values()].find(
                (s) => s.slug === args.where.slug,
              );
        if (row === undefined) throw new Error("society not found");
        Object.assign(row, args.data);
        return row;
      },
      groupBy: async (args: {
        by: string[];
        where?: Record<string, unknown>;
      }) => {
        store.dbCallCount += 1;
        const rows = [...store.societies.values()].filter((row) =>
          matchesSocietyWhere(row, args.where),
        );
        const groups = new Map<string, { key: Record<string, unknown>; count: number }>();
        for (const row of rows) {
          const key: Record<string, unknown> = {};
          for (const field of args.by) {
            key[field] = (row as unknown as Record<string, unknown>)[field];
          }
          const mapKey = JSON.stringify(key);
          const existing = groups.get(mapKey);
          if (existing === undefined) groups.set(mapKey, { key, count: 1 });
          else existing.count += 1;
        }
        return [...groups.values()].map((group) => ({
          ...group.key,
          _count: { _all: group.count },
        }));
      },
      count: async (args?: { where?: Record<string, unknown> }) => {
        store.dbCallCount += 1;
        return [...store.societies.values()].filter((row) =>
          matchesSocietyWhere(row, args?.where),
        ).length;
      },
    },

    review: {
      groupBy: async (args: {
        by: string[];
        where?: { subjectSocietyId?: { in?: string[] } };
      }) => {
        store.dbCallCount += 1;
        const allowed = args.where?.subjectSocietyId?.in;
        const rows = [...store.reviews.values()].filter(
          (r) =>
            r.subjectSocietyId !== null &&
            (allowed === undefined || allowed.includes(r.subjectSocietyId)),
        );
        const groups = new Map<string, { sum: number; count: number }>();
        for (const row of rows) {
          const key = row.subjectSocietyId as string;
          const existing = groups.get(key) ?? { sum: 0, count: 0 };
          existing.sum += row.rating;
          existing.count += 1;
          groups.set(key, existing);
        }
        return [...groups.entries()].map(([subjectSocietyId, { sum, count }]) => ({
          subjectSocietyId,
          _avg: { rating: sum / count },
          _count: { _all: count },
        }));
      },
      aggregate: async () => {
        store.dbCallCount += 1;
        return { _avg: { rating: null } };
      },
    },

    paymentPlan: {
      findUnique: async (args: WhereId) =>
        store.paymentPlans.get(args.where.id) ?? null,
    },

    inventoryCategory: {
      findMany: async (args?: {
        where?: { societyId?: string | { in?: string[] } };
        select?: Record<string, boolean>;
      }) => {
        store.dbCallCount += 1;
        const filter = args?.where?.societyId;
        return [...store.categories.values()].filter((category) => {
          if (filter === undefined) return true;
          if (typeof filter === "string") return category.societyId === filter;
          if (filter.in !== undefined) return filter.in.includes(category.societyId);
          return true;
        });
      },
      findUnique: async (args: {
        where: { id: string };
        include?: {
          plots?: { where?: { status?: string } };
          paymentPlans?: boolean;
        };
      }) => {
        const category = store.categories.get(args.where.id);
        if (category === undefined) return null;
        const paymentPlans =
          args.include?.paymentPlans === true
            ? [...store.paymentPlans.values()].filter(
                (plan) => plan.categoryId === category.id,
              )
            : undefined;
        if (args.include?.plots !== undefined) {
          const statusFilter = args.include.plots.where?.status;
          const plots = [...store.plots.values()]
            .filter((p) => p.categoryId === category.id)
            .filter((p) =>
              statusFilter === undefined ? true : p.status === statusFilter,
            )
            .sort((a, b) => a.serialNo.localeCompare(b.serialNo));
          return { ...category, plots, paymentPlans };
        }
        return paymentPlans === undefined
          ? { ...category }
          : { ...category, paymentPlans };
      },
      update: async (args: WhereId & { data: Record<string, unknown> }) => {
        const row = store.categories.get(args.where.id);
        if (row === undefined) throw new Error("category not found");
        if ("availableUnits" in args.data) {
          row.availableUnits = applyNumericWrite(
            row.availableUnits,
            args.data.availableUnits,
          );
        }
        return row;
      },
    },

    plot: {
      update: async (args: WhereId & { data: Record<string, unknown> }) => {
        const row = store.plots.get(args.where.id);
        if (row === undefined) throw new Error("plot not found");
        Object.assign(row, args.data);
        return row;
      },
    },

    lead: {
      findUnique: async (args: WhereId) => store.leads.get(args.where.id) ?? null,
      findMany: async (args?: {
        where?: { buyerUserId?: string };
        orderBy?: { createdAt?: "asc" | "desc" };
      }) => {
        let rows = [...store.leads.values()].filter((lead) => {
          if (
            args?.where?.buyerUserId !== undefined &&
            lead.buyerUserId !== args.where.buyerUserId
          ) {
            return false;
          }
          return true;
        });
        if (args?.orderBy?.createdAt === "desc") {
          rows = rows.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        }
        return rows;
      },
      create: async (args: { data: Record<string, unknown> }) => {
        const id = store.nextLeadId();
        const now = new Date("2026-06-01T00:00:00.000Z");
        const row: LeadRow = {
          id,
          name: String(args.data.name),
          phone: String(args.data.phone),
          email: (args.data.email as string | null) ?? null,
          societyIds: (args.data.societyIds as string[]) ?? [],
          categoryId: (args.data.categoryId as string | null) ?? null,
          budgetPkr: (args.data.budgetPkr as number | null) ?? null,
          paymentPlanPreference:
            (args.data.paymentPlanPreference as string | null) ?? null,
          source: String(args.data.source),
          status: String(args.data.status),
          notes: (args.data.notes as string | null) ?? null,
          buyerUserId: (args.data.buyerUserId as string | null) ?? null,
          assignedAdvisorId:
            (args.data.assignedAdvisorId as string | null) ?? null,
          createdAt: now,
          updatedAt: now,
        };
        store.leads.set(id, row);
        return row;
      },
      update: async (args: WhereId & { data: Record<string, unknown> }) => {
        const row = store.leads.get(args.where.id);
        if (row === undefined) throw new Error("lead not found");
        Object.assign(row, args.data, {
          updatedAt: new Date("2026-06-01T00:00:00.000Z"),
        });
        return row;
      },
    },

    dealerProfile: {
      findUnique: async (args: {
        where: { id?: string; userId?: string };
        select?: Record<string, boolean>;
      }) => {
        const row =
          args.where.id !== undefined
            ? (store.dealerProfiles.get(args.where.id) ?? null)
            : ([...store.dealerProfiles.values()].find(
                (dealer) => dealer.userId === args.where.userId,
              ) ?? null);
        return row;
      },
    },

    dealerNetSheet: {
      findMany: async (args?: {
        where?: { dealerId?: string; categoryId?: string };
        include?: {
          dealer?: { select?: Record<string, boolean> };
          category?: {
            select?: Record<string, boolean | { select?: Record<string, boolean> }>;
          };
        };
        orderBy?:
          | { updatedAt?: "asc" | "desc"; netPricePkr?: "asc" | "desc" }
          | Array<Record<string, "asc" | "desc">>;
      }) => {
        let rows = [...store.dealerNetSheets.values()].filter((sheet) => {
          if (
            args?.where?.dealerId !== undefined &&
            sheet.dealerId !== args.where.dealerId
          ) {
            return false;
          }
          if (
            args?.where?.categoryId !== undefined &&
            sheet.categoryId !== args.where.categoryId
          ) {
            return false;
          }
          return true;
        });

        const clauses = Array.isArray(args?.orderBy)
          ? args.orderBy
          : args?.orderBy !== undefined
            ? [args.orderBy]
            : [];
        if (clauses.length > 0) {
          rows = [...rows].sort((a, b) => {
            for (const clause of clauses) {
              const [field, direction] = Object.entries(clause)[0] ?? [];
              if (field === undefined) continue;
              const av = (a as unknown as Record<string, unknown>)[field];
              const bv = (b as unknown as Record<string, unknown>)[field];
              const cmp =
                av instanceof Date && bv instanceof Date
                  ? av.getTime() - bv.getTime()
                  : typeof av === "number" && typeof bv === "number"
                    ? av - bv
                    : String(av).localeCompare(String(bv));
              if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
            }
            return 0;
          });
        }

        return rows.map((sheet) => {
          const dealer = store.dealerProfiles.get(sheet.dealerId);
          const category = store.categories.get(sheet.categoryId);
          const society =
            category !== undefined
              ? store.societies.get(category.societyId)
              : undefined;
          return {
            ...sheet,
            dealer:
              dealer === undefined
                ? undefined
                : {
                    id: dealer.id,
                    agencyName: dealer.agencyName,
                    slug: dealer.slug,
                  },
            category:
              category === undefined
                ? undefined
                : {
                    ...category,
                    society:
                      society === undefined
                        ? undefined
                        : { name: society.name, slug: society.slug },
                  },
          };
        });
      },
    },

    quote: {
      findMany: async (args?: {
        where?: { buyerUserId?: string; leadId?: string };
        include?: {
          payments?: { where?: { status?: string } };
          category?: { include?: { paymentPlans?: boolean } };
          society?: { select?: { name?: boolean } };
        };
        orderBy?: { createdAt?: "asc" | "desc"; updatedAt?: "asc" | "desc" };
      }) => {
        let rows = [...store.quotes.values()].filter((quote) => {
          if (
            args?.where?.buyerUserId !== undefined &&
            quote.buyerUserId !== args.where.buyerUserId
          ) {
            return false;
          }
          if (
            args?.where?.leadId !== undefined &&
            quote.leadId !== args.where.leadId
          ) {
            return false;
          }
          return true;
        });
        if (args?.orderBy?.createdAt === "desc") {
          rows = rows.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        }
        if (args?.orderBy?.updatedAt === "desc") {
          rows = rows.sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
          );
        }
        return rows.map((quote) => {
          const payments = [...store.quotePayments.values()].filter((payment) => {
            if (payment.quoteId !== quote.id) return false;
            const statusFilter = args?.include?.payments?.where?.status;
            return statusFilter === undefined
              ? true
              : payment.status === statusFilter;
          });
          const category = store.categories.get(quote.categoryId);
          const paymentPlans =
            args?.include?.category?.include?.paymentPlans === true && category
              ? [...store.paymentPlans.values()].filter(
                  (plan) => plan.categoryId === category.id,
                )
              : undefined;
          const society = store.societies.get(quote.societyId);
          return {
            ...quote,
            payments,
            society:
              args?.include?.society !== undefined && society !== undefined
                ? { name: society.name }
                : undefined,
            category:
              category === undefined
                ? undefined
                : paymentPlans === undefined
                  ? category
                  : { ...category, paymentPlans },
          };
        });
      },
      findUnique: async (args: {
        where: { id: string };
        include?: {
          payments?: { where?: { status?: string } };
          category?: { include?: { paymentPlans?: boolean } };
        };
      }) => {
        const quote = store.quotes.get(args.where.id);
        if (quote === undefined) return null;
        const payments = [...store.quotePayments.values()].filter((payment) => {
          if (payment.quoteId !== quote.id) return false;
          const statusFilter = args.include?.payments?.where?.status;
          return statusFilter === undefined
            ? true
            : payment.status === statusFilter;
        });
        const category = store.categories.get(quote.categoryId);
        const paymentPlans =
          args.include?.category?.include?.paymentPlans === true && category
            ? [...store.paymentPlans.values()].filter(
                (plan) => plan.categoryId === category.id,
              )
            : undefined;
        return {
          ...quote,
          payments,
          category:
            category === undefined
              ? undefined
              : paymentPlans === undefined
                ? category
                : { ...category, paymentPlans },
        };
      },
      findUniqueOrThrow: async (args: {
        where: { id: string };
        include?: {
          payments?: { where?: { status?: string } };
          category?: { include?: { paymentPlans?: boolean } };
        };
      }) => {
        const quote = store.quotes.get(args.where.id);
        if (quote === undefined) throw new Error("quote not found");
        const payments = [...store.quotePayments.values()].filter((payment) => {
          if (payment.quoteId !== quote.id) return false;
          const statusFilter = args.include?.payments?.where?.status;
          return statusFilter === undefined
            ? true
            : payment.status === statusFilter;
        });
        const category = store.categories.get(quote.categoryId);
        const paymentPlans =
          args.include?.category?.include?.paymentPlans === true && category
            ? [...store.paymentPlans.values()].filter(
                (plan) => plan.categoryId === category.id,
              )
            : undefined;
        return {
          ...quote,
          payments,
          category:
            category === undefined
              ? undefined
              : paymentPlans === undefined
                ? category
                : { ...category, paymentPlans },
        };
      },
      create: async (args: { data: Record<string, unknown> }) => {
        const id = store.nextQuoteId();
        const now = new Date("2026-06-01T00:00:00.000Z");
        const row: QuoteRow = {
          id,
          leadId: String(args.data.leadId),
          societyId: String(args.data.societyId),
          categoryId: String(args.data.categoryId),
          dealerId: String(args.data.dealerId),
          dealerNetPkr: Number(args.data.dealerNetPkr),
          quotedPricePkr: Number(args.data.quotedPricePkr),
          spreadPkr: Number(args.data.spreadPkr),
          tokenAmountPkr: Number(args.data.tokenAmountPkr),
          validUntil: args.data.validUntil as Date,
          status: String(args.data.status),
          paymentPlanLabel: (args.data.paymentPlanLabel as string | null) ?? null,
          installmentsDirect: Boolean(args.data.installmentsDirect ?? false),
          createdById: String(args.data.createdById),
          buyerUserId: (args.data.buyerUserId as string | null) ?? null,
          createdAt: now,
          updatedAt: now,
        };
        store.quotes.set(id, row);
        return row;
      },
      update: async (args: WhereId & { data: Record<string, unknown> }) => {
        const row = store.quotes.get(args.where.id);
        if (row === undefined) throw new Error("quote not found");
        Object.assign(row, args.data, {
          updatedAt: new Date("2026-06-01T00:00:00.000Z"),
        });
        return row;
      },
      updateMany: async (args: {
        where: { leadId?: string; status?: string };
        data: Record<string, unknown>;
      }) => {
        let count = 0;
        for (const row of store.quotes.values()) {
          if (
            args.where.leadId !== undefined &&
            row.leadId !== args.where.leadId
          ) {
            continue;
          }
          if (
            args.where.status !== undefined &&
            row.status !== args.where.status
          ) {
            continue;
          }
          Object.assign(row, args.data, {
            updatedAt: new Date("2026-06-01T00:00:00.000Z"),
          });
          count += 1;
        }
        return { count };
      },
    },

    quotePayment: {
      findFirst: async (args: {
        where: {
          quoteId?: string;
          type?: string;
          installmentIndex?: number;
          status?: string;
        };
      }) => {
        return (
          [...store.quotePayments.values()].find((payment) => {
            if (
              args.where.quoteId !== undefined &&
              payment.quoteId !== args.where.quoteId
            ) {
              return false;
            }
            if (
              args.where.type !== undefined &&
              payment.type !== args.where.type
            ) {
              return false;
            }
            if (
              args.where.installmentIndex !== undefined &&
              payment.installmentIndex !== args.where.installmentIndex
            ) {
              return false;
            }
            if (
              args.where.status !== undefined &&
              payment.status !== args.where.status
            ) {
              return false;
            }
            return true;
          }) ?? null
        );
      },
      create: async (args: { data: Record<string, unknown> }) => {
        const id = store.nextQuotePaymentId();
        const row: QuotePaymentRow = {
          id,
          quoteId: String(args.data.quoteId),
          type: String(args.data.type),
          amountPkr: Number(args.data.amountPkr),
          installmentIndex:
            (args.data.installmentIndex as number | null | undefined) ?? null,
          status: String(args.data.status),
          externalEventId: (args.data.externalEventId as string | null) ?? null,
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
        };
        store.quotePayments.set(id, row);
        return row;
      },
    },

    fulfillmentOrder: {
      create: async (args: { data: Record<string, unknown> }) => {
        const id = store.nextFulfillmentId();
        const now = new Date("2026-06-01T00:00:00.000Z");
        const row: FulfillmentOrderRow = {
          id,
          quoteId: String(args.data.quoteId),
          dealerId: String(args.data.dealerId),
          orderRef: String(args.data.orderRef),
          status: String(args.data.status),
          plotRef: (args.data.plotRef as string | null) ?? null,
          createdAt: now,
          updatedAt: now,
        };
        store.fulfillmentOrders.set(id, row);
        return row;
      },
      findUnique: async (args: WhereId) =>
        store.fulfillmentOrders.get(args.where.id) ?? null,
      findMany: async (args?: {
        where?: { dealerId?: string };
        include?: {
          quote?: {
            select?: Record<string, unknown>;
          };
          dealer?: { select?: { agencyName?: boolean } };
        };
        orderBy?: { createdAt?: "asc" | "desc" };
      }) => {
        let rows = [...store.fulfillmentOrders.values()].filter((order) => {
          if (
            args?.where?.dealerId !== undefined &&
            order.dealerId !== args.where.dealerId
          ) {
            return false;
          }
          return true;
        });
        if (args?.orderBy?.createdAt === "desc") {
          rows = rows.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );
        }

        return rows.map((order) => {
          const quote = store.quotes.get(order.quoteId);
          const category =
            quote !== undefined
              ? store.categories.get(quote.categoryId)
              : undefined;
          const society =
            category !== undefined
              ? store.societies.get(category.societyId)
              : undefined;
          const lead =
            quote !== undefined ? store.leads.get(quote.leadId) : undefined;
          const dealer = store.dealerProfiles.get(order.dealerId);

          return {
            ...order,
            dealer:
              dealer === undefined
                ? undefined
                : { agencyName: dealer.agencyName },
            quote:
              quote === undefined
                ? undefined
                : {
                    quotedPricePkr: quote.quotedPricePkr,
                    spreadPkr: quote.spreadPkr,
                    lead: lead === undefined ? undefined : { name: lead.name },
                    category:
                      category === undefined
                        ? undefined
                        : {
                            phase: category.phase,
                            block: category.block,
                            sizeLabel: category.sizeLabel,
                            society:
                              society === undefined
                                ? undefined
                                : { name: society.name },
                          },
                  },
          };
        });
      },
      update: async (args: WhereId & { data: Record<string, unknown> }) => {
        const row = store.fulfillmentOrders.get(args.where.id);
        if (row === undefined) throw new Error("fulfillment order not found");
        Object.assign(row, args.data, {
          updatedAt: new Date("2026-06-01T00:00:00.000Z"),
        });
        return row;
      },
    },

    booking: {
      findUnique: async (args: {
        where: { id: string };
        include?: Record<string, unknown>;
      }) => store.bookings.get(args.where.id) ?? null,
      findMany: async () => [...store.bookings.values()],
      create: async (args: { data: Record<string, unknown> }) => {
        const id = store.nextBookingId();
        const row: BookingRow = {
          id,
          buyerId: String(args.data.buyerId),
          categoryId: String(args.data.categoryId),
          paymentPlanId: String(args.data.paymentPlanId),
          dealerId: (args.data.dealerId as string | null) ?? null,
          status: String(args.data.status),
          taxBreakdown: args.data.taxBreakdown,
          createdAt: new Date("2026-06-01T00:00:00.000Z"),
        };
        store.bookings.set(id, row);
        return row;
      },
      update: async (args: WhereId & { data: Record<string, unknown> }) => {
        const row = store.bookings.get(args.where.id);
        if (row === undefined) throw new Error("booking not found");
        if (typeof args.data.status === "string") {
          row.status = args.data.status;
        }
        return row;
      },
    },

    ledgerEvent: {
      create: async (args: { data: LedgerRow }) => {
        if (store.failLedgerCreate) {
          throw new Error("simulated ledger write failure");
        }
        const row: LedgerRow = { ...args.data };
        store.ledgerEvents.set(row.id, row);
        return row;
      },
      findMany: async () => [...store.ledgerEvents.values()],
    },
  };

  attachProfileV2Models(
    client as Record<string, unknown>,
    store,
    store.profileV2,
  );

  return client as unknown as PrismaClient;
}

/** Builds a fresh fake database and exposes its store for assertions. */
export function createInMemoryDb(): { db: PrismaClient; store: Store } {
  const store = new Store();
  return { db: buildClient(store), store };
}
