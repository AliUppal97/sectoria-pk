import type { PrismaClient } from "@sectoria/database";

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
  bookings = new Map<string, BookingRow>();
  ledgerEvents = new Map<string, LedgerRow>();

  /** Test hook: when set, every `ledgerEvent.create` throws to force a rollback. */
  failLedgerCreate = false;

  private bookingCounter = 0;

  nextBookingId(): string {
    this.bookingCounter += 1;
    return `bk_${this.bookingCounter}`;
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
    clone(store.bookings),
    clone(store.ledgerEvents),
  ];
}

function restore(store: Store, snap: Map<string, unknown>[]): void {
  const [users, societies, categories, plots, paymentPlans, bookings, ledger] =
    snap;
  store.users = users as Map<string, UserRow>;
  store.societies = societies as Map<string, SocietyRow>;
  store.categories = categories as Map<string, CategoryRow>;
  store.plots = plots as Map<string, PlotRow>;
  store.paymentPlans = paymentPlans as Map<string, PaymentPlanRow>;
  store.bookings = bookings as Map<string, BookingRow>;
  store.ledgerEvents = ledger as Map<string, LedgerRow>;
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
      findUnique: async (args: WhereId) =>
        store.users.get(args.where.id) ?? null,
      update: async (args: WhereId & { data: Record<string, unknown> }) => {
        const row = store.users.get(args.where.id);
        if (row === undefined) throw new Error("user not found");
        Object.assign(row, args.data);
        return row;
      },
    },

    society: {
      findMany: async () => [...store.societies.values()],
      findUnique: async (args: { where: { id?: string; slug?: string } }) => {
        if (args.where.id !== undefined) {
          return store.societies.get(args.where.id) ?? null;
        }
        return (
          [...store.societies.values()].find(
            (s) => s.slug === args.where.slug,
          ) ?? null
        );
      },
      update: async (args: WhereId & { data: Record<string, unknown> }) => {
        const row = store.societies.get(args.where.id);
        if (row === undefined) throw new Error("society not found");
        Object.assign(row, args.data);
        return row;
      },
    },

    paymentPlan: {
      findUnique: async (args: WhereId) =>
        store.paymentPlans.get(args.where.id) ?? null,
    },

    inventoryCategory: {
      findUnique: async (args: {
        where: { id: string };
        include?: { plots?: { where?: { status?: string } } };
      }) => {
        const category = store.categories.get(args.where.id);
        if (category === undefined) return null;
        if (args.include?.plots !== undefined) {
          const statusFilter = args.include.plots.where?.status;
          const plots = [...store.plots.values()]
            .filter((p) => p.categoryId === category.id)
            .filter((p) =>
              statusFilter === undefined ? true : p.status === statusFilter,
            )
            .sort((a, b) => a.serialNo.localeCompare(b.serialNo));
          return { ...category, plots };
        }
        return { ...category };
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

  return client as unknown as PrismaClient;
}

/** Builds a fresh fake database and exposes its store for assertions. */
export function createInMemoryDb(): { db: PrismaClient; store: Store } {
  const store = new Store();
  return { db: buildClient(store), store };
}
