import { beforeEach, describe, expect, it } from "vitest";
import { AtlStatus, EscrowState, PlotStatus } from "@sectoria/types";
import { createInMemoryDb, Store } from "./helpers/in-memory-db.js";
import {
  buyerSession,
  createTestCaller,
  societyAdminSession,
} from "./helpers/test-context.js";

beforeEach(() => {
  process.env.FEATURE_LEGACY_SELF_SERVE_BOOKING = "true";
});

const SOCIETY_ID = "soc_1";
const OTHER_SOCIETY_ID = "soc_2";
const CATEGORY_ID = "cat_1";
const PAYMENT_PLAN_ID = "pp_1";
const BUYER_ID = "usr_buyer";
const ADMIN_ID = "usr_admin";

/** Seeds a buyer, a FIFO category with one available plot, and a payment plan. */
function seedBaseFixtures(store: Store): void {
  store.users.set(BUYER_ID, {
    id: BUYER_ID,
    atlStatus: AtlStatus.FILER,
    nadraVerified: true,
    cnicEncrypted: null,
    ntnEncrypted: null,
    atlVerifiedAt: null,
  });
  store.categories.set(CATEGORY_ID, {
    id: CATEGORY_ID,
    societyId: SOCIETY_ID,
    slug: "phase-1-block-a-5-marla",
    phase: "1",
    block: "A",
    plotType: "RESIDENTIAL",
    sizeLabel: "5 Marla",
    sizeSqft: 1125,
    pricePerSqft: "9000",
    totalUnits: 10,
    availableUnits: 10,
    allocationStrategy: "FIFO",
    // A zone present in the FBR valuation table → the server derives the table
    // value (Zone-II residential = 8,000/sqft × 1125 sqft = 9,000,000).
    fbrValuationZone: "Zone-II",
  });
  store.plots.set("plot_1", {
    id: "plot_1",
    categoryId: CATEGORY_ID,
    serialNo: "0001",
    plotNo: "A-1",
    status: PlotStatus.AVAILABLE,
    bookingId: null,
  });
  store.paymentPlans.set(PAYMENT_PLAN_ID, {
    id: PAYMENT_PLAN_ID,
    categoryId: CATEGORY_ID,
    label: "3-Year Installments",
    downPaymentPct: "20.00",
    installmentCount: 36,
    installmentInterval: "monthly",
  });
}

/** Seeds a booking already in the BOOKING_TOKEN_PAID state, ready to allocate. */
function seedTokenPaidBooking(store: Store, id = "bk_existing"): void {
  store.bookings.set(id, {
    id,
    buyerId: BUYER_ID,
    categoryId: CATEGORY_ID,
    paymentPlanId: PAYMENT_PLAN_ID,
    dealerId: null,
    status: EscrowState.BOOKING_TOKEN_PAID,
    taxBreakdown: {
      section236C: 0,
      section236K: 0,
      section7E: 0,
      stampDuty: 0,
      regulatoryFee: 0,
      total: 0,
      breakdown: [],
    },
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
  });
}

describe("bookingRouter.create", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedBaseFixtures(store);
  });

  it("creates a booking with a tax snapshot and a BOOKING_CREATED ledger event in one transaction", async () => {
    const caller = createTestCaller({ db, session: buyerSession(BUYER_ID) });

    const booking = await caller.booking.create({
      categoryId: CATEGORY_ID,
      paymentPlanId: PAYMENT_PLAN_ID,
      agreedSalePrice: 12_000_000,
    });

    expect(booking.status).toBe(EscrowState.BOOKING_TOKEN_PAID);
    // The tax breakdown was computed by the domain package, not faked here.
    expect(booking.taxBreakdown.total).toBeGreaterThan(0);
    // Sale price (12M) exceeds the zone-derived FBR value (9M), so it is the
    // taxable base: 236K for a filer buyer = 3% of 12,000,000.
    expect(booking.taxBreakdown.section236K).toBe(360_000);

    const events = [...store.ledgerEvents.values()];
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("BOOKING_CREATED");
    expect(events[0]?.actorId).toBe(BUYER_ID);
  });

  it("derives the FBR table value from the category's zone, not from the request — an under-declared sale price is taxed on the FBR floor", async () => {
    const caller = createTestCaller({ db, session: buyerSession(BUYER_ID) });

    // Sale price (5M) is below the zone-derived FBR value (9M), so the FBR
    // floor becomes the taxable base: 236K for a filer buyer = 3% of 9,000,000.
    const booking = await caller.booking.create({
      categoryId: CATEGORY_ID,
      paymentPlanId: PAYMENT_PLAN_ID,
      agreedSalePrice: 5_000_000,
    });

    expect(booking.taxBreakdown.section236K).toBe(270_000);
  });

  it("rejects an unauthenticated caller with UNAUTHORIZED", async () => {
    const caller = createTestCaller({ db, session: null });
    await expect(
      caller.booking.create({
        categoryId: CATEGORY_ID,
        paymentPlanId: PAYMENT_PLAN_ID,
        agreedSalePrice: 12_000_000,
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a buyer who has not completed NADRA verification with FORBIDDEN", async () => {
    const caller = createTestCaller({
      db,
      session: buyerSession(BUYER_ID, { nadraVerified: false }),
    });
    await expect(
      caller.booking.create({
        categoryId: CATEGORY_ID,
        paymentPlanId: PAYMENT_PLAN_ID,
        agreedSalePrice: 12_000_000,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a non-buyer role with FORBIDDEN", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession(ADMIN_ID, SOCIETY_ID),
    });
    await expect(
      caller.booking.create({
        categoryId: CATEGORY_ID,
        paymentPlanId: PAYMENT_PLAN_ID,
        agreedSalePrice: 12_000_000,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("bookingRouter.allocate", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedBaseFixtures(store);
    seedTokenPaidBooking(store);
  });

  it("allocates a plot, advances escrow to ALLOCATED, and records the event atomically", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession(ADMIN_ID, SOCIETY_ID),
    });

    const result = await caller.booking.allocate({ bookingId: "bk_existing" });

    expect(result.booking.status).toBe(EscrowState.ALLOCATED);
    expect(result.allocatedPlotId).toBe("plot_1");

    // State, plot assignment, availability, and the audit event all committed.
    expect(store.bookings.get("bk_existing")?.status).toBe(
      EscrowState.ALLOCATED,
    );
    expect(store.plots.get("plot_1")?.status).toBe(PlotStatus.ALLOCATED);
    expect(store.plots.get("plot_1")?.bookingId).toBe("bk_existing");
    expect(store.categories.get(CATEGORY_ID)?.availableUnits).toBe(9);

    const events = [...store.ledgerEvents.values()];
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("ESCROW_TRANSITIONED");
    expect((events[0]?.payload as { toState: string }).toState).toBe(
      EscrowState.ALLOCATED,
    );
  });

  it("rolls the escrow transition back when the ledger write fails — no orphan event, no partial state", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession(ADMIN_ID, SOCIETY_ID),
    });

    // Force the ledger INSERT (the last write in the transaction) to fail.
    store.failLedgerCreate = true;

    await expect(
      caller.booking.allocate({ bookingId: "bk_existing" }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });

    // Everything the transaction touched must be untouched after rollback.
    expect(store.bookings.get("bk_existing")?.status).toBe(
      EscrowState.BOOKING_TOKEN_PAID,
    );
    expect(store.plots.get("plot_1")?.status).toBe(PlotStatus.AVAILABLE);
    expect(store.plots.get("plot_1")?.bookingId).toBeNull();
    expect(store.categories.get(CATEGORY_ID)?.availableUnits).toBe(10);
    expect(store.ledgerEvents.size).toBe(0);
  });

  it("is idempotent: an already-allocated booking is returned unchanged", async () => {
    store.bookings.get("bk_existing")!.status = EscrowState.ALLOCATED;
    const caller = createTestCaller({
      db,
      session: societyAdminSession(ADMIN_ID, SOCIETY_ID),
    });

    const result = await caller.booking.allocate({ bookingId: "bk_existing" });

    expect(result.booking.status).toBe(EscrowState.ALLOCATED);
    expect(store.ledgerEvents.size).toBe(0);
    expect(store.categories.get(CATEGORY_ID)?.availableUnits).toBe(10);
  });

  it("denies a buyer (wrong role) with FORBIDDEN", async () => {
    const caller = createTestCaller({ db, session: buyerSession(BUYER_ID) });
    await expect(
      caller.booking.allocate({ bookingId: "bk_existing" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies a society admin who does not own this society (ownership) with FORBIDDEN", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession(ADMIN_ID, OTHER_SOCIETY_ID),
    });
    await expect(
      caller.booking.allocate({ bookingId: "bk_existing" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    // The denied call left no trace.
    expect(store.bookings.get("bk_existing")?.status).toBe(
      EscrowState.BOOKING_TOKEN_PAID,
    );
    expect(store.ledgerEvents.size).toBe(0);
  });
});
