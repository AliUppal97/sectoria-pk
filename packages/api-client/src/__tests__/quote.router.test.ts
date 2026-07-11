import { beforeEach, describe, expect, it } from "vitest";
import {
  InstallmentInterval,
  QuotePaymentStatus,
  QuotePaymentType,
  QuoteStatus,
} from "@sectoria/types";
import { TRPCError } from "@trpc/server";
import { createInMemoryDb, type Store } from "./helpers/in-memory-db.js";
import {
  assertNoForbiddenBuyerFields,
  FORBIDDEN_BUYER_FIELDS,
} from "../lib/society-profile-dto.js";
import { buyerSession, createTestCaller } from "./helpers/test-context.js";

const BUYER_ID = "usr_buyer";
const CATEGORY_ID = "cat_1";
const PAYMENT_PLAN_ID = "pp_1";
const QUOTE_ID = "quote_1";
const TOKEN_PAID_AT = new Date("2026-06-01T00:00:00.000Z");

function seedInstallmentQuoteFixture(store: Store): void {
  store.categories.set(CATEGORY_ID, {
    id: CATEGORY_ID,
    societyId: "soc_1",
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
    fbrValuationZone: "Zone-II",
  });
  store.paymentPlans.set(PAYMENT_PLAN_ID, {
    id: PAYMENT_PLAN_ID,
    categoryId: CATEGORY_ID,
    label: "3-Year Installments",
    downPaymentPct: "20.00",
    installmentCount: 4,
    installmentInterval: InstallmentInterval.MONTHLY,
  });
  store.quotes.set(QUOTE_ID, {
    id: QUOTE_ID,
    leadId: "lead_1",
    societyId: "soc_1",
    categoryId: CATEGORY_ID,
    dealerId: "dealer_1",
    dealerNetPkr: 9_600_000,
    quotedPricePkr: 10_000_000,
    spreadPkr: 400_000,
    tokenAmountPkr: 2_000_000,
    validUntil: new Date("2026-12-31T00:00:00.000Z"),
    status: QuoteStatus.ACCEPTED,
    paymentPlanLabel: "3-Year Installments",
    installmentsDirect: false,
    createdById: "advisor_1",
    buyerUserId: BUYER_ID,
    createdAt: TOKEN_PAID_AT,
    updatedAt: TOKEN_PAID_AT,
  });
  store.quotePayments.set("qp_token", {
    id: "qp_token",
    quoteId: QUOTE_ID,
    type: QuotePaymentType.TOKEN,
    amountPkr: 2_000_000,
    installmentIndex: null,
    status: QuotePaymentStatus.CONFIRMED,
    externalEventId: "evt_token",
    createdAt: TOKEN_PAID_AT,
  });
}

describe("quoteRouter.listForBuyer", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedInstallmentQuoteFixture(store);
  });

  it("returns installment schedule rows for platform-collected quotes", async () => {
    const caller = createTestCaller({ db, session: buyerSession(BUYER_ID) });
    const quotes = await caller.quote.listForBuyer();

    expect(quotes).toHaveLength(1);
    expect(quotes[0]?.installmentSchedule).toHaveLength(4);
    expect(quotes[0]?.installmentSchedule[0]).toMatchObject({
      index: 0,
      status: "PENDING",
      dueLabel: "Installment 1 · 1 Jul 2026",
      amountPkr: 2_000_000,
    });
    expect(quotes[0]?.nextInstallmentIndex).toBe(0);
    assertNoForbiddenBuyerFields(quotes);
    for (const field of FORBIDDEN_BUYER_FIELDS) {
      expect(JSON.stringify(quotes)).not.toContain(`"${field}"`);
    }
  });
});

describe("quoteRouter.payInstallment", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedInstallmentQuoteFixture(store);
  });

  it("pays the next unpaid installment index from the schedule", async () => {
    const caller = createTestCaller({ db, session: buyerSession(BUYER_ID) });

    const first = await caller.quote.payInstallment({
      quoteId: QUOTE_ID,
      installmentIndex: 0,
    });
    expect(first).toEqual({ ok: true, alreadyPaid: false });

    const payments = [...store.quotePayments.values()].filter(
      (payment) => payment.type === QuotePaymentType.INSTALLMENT,
    );
    expect(payments).toHaveLength(1);
    expect(payments[0]?.installmentIndex).toBe(0);
    expect(payments[0]?.amountPkr).toBe(2_000_000);

    const quotes = await caller.quote.listForBuyer();
    expect(quotes[0]?.nextInstallmentIndex).toBe(1);
    expect(quotes[0]?.installmentSchedule[0]?.status).toBe("PAID");
  });

  it("returns idempotently when the same installment index is paid again", async () => {
    const caller = createTestCaller({ db, session: buyerSession(BUYER_ID) });

    await caller.quote.payInstallment({
      quoteId: QUOTE_ID,
      installmentIndex: 0,
    });
    const second = await caller.quote.payInstallment({
      quoteId: QUOTE_ID,
      installmentIndex: 0,
    });

    expect(second).toEqual({ ok: true, alreadyPaid: true });
    const installmentPayments = [...store.quotePayments.values()].filter(
      (payment) => payment.type === QuotePaymentType.INSTALLMENT,
    );
    expect(installmentPayments).toHaveLength(1);
  });

  it("rejects paying an installment out of order", async () => {
    const caller = createTestCaller({ db, session: buyerSession(BUYER_ID) });

    await expect(
      caller.quote.payInstallment({
        quoteId: QUOTE_ID,
        installmentIndex: 1,
      }),
    ).rejects.toSatisfy((error: unknown) => {
      return (
        error instanceof TRPCError &&
        error.code === "BAD_REQUEST" &&
        error.message.includes("Pay installment 1 next")
      );
    });
  });
});
