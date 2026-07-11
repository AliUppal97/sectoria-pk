import { beforeEach, describe, expect, it } from "vitest";
import {
  FulfillmentStatus,
  LeadSource,
  LeadStatus,
  QuoteStatus,
} from "@sectoria/types";
import { TRPCError } from "@trpc/server";
import {
  assertNoForbiddenBuyerFields,
  FORBIDDEN_BUYER_FIELDS,
} from "../lib/society-profile-dto.js";
import { createInMemoryDb, type Store } from "./helpers/in-memory-db.js";
import {
  buyerSession,
  createTestCaller,
  dealerSession,
  salesAdvisorSession,
} from "./helpers/test-context.js";

const SOCIETY_ID = "soc_1";
const CATEGORY_ID = "cat_1";
const DEALER_USER_ID = "usr_dealer";
const DEALER_ID = "dealer_1";
const BUYER_ID = "usr_buyer";
const OTHER_BUYER_ID = "usr_buyer_other";
const ADVISOR_ID = "usr_advisor";
const LEAD_ID = "lead_seed_1";
const QUOTE_OWN = "quote_own";
const QUOTE_OTHER = "quote_other";
const FIXED_NOW = new Date("2026-06-01T00:00:00.000Z");

const BUYER_PII_FIELDS = ["name", "phone", "cnic", "email"] as const;

function seedSocietyAndCategory(store: Store): void {
  store.societies.set(SOCIETY_ID, {
    id: SOCIETY_ID,
    slug: "bahria-town",
    name: "Bahria Town",
    city: "Islamabad",
    citySlug: "islamabad",
    authority: "CDA",
    verificationTier: "VERIFIED",
    description: "Test society",
    amenities: [],
    developmentStage: "UNDER_DEVELOPMENT",
    developmentPct: 50,
    heroImageUrl: null,
    latitude: null,
    longitude: null,
    lopReferenceNo: null,
    nocReferenceNo: null,
    hsmsLinked: false,
    totalLandKanal: null,
    developedLandKanal: null,
    bookingStatus: "OPEN",
    publishStatus: "PUBLISHED",
    publishedAt: FIXED_NOW,
    createdById: null,
    createdAt: FIXED_NOW,
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
    fbrValuationZone: "Zone-II",
  });
}

function seedDealer(store: Store): void {
  store.dealerProfiles.set(DEALER_ID, {
    id: DEALER_ID,
    userId: DEALER_USER_ID,
    slug: "alpha-realty",
    agencyName: "Alpha Realty",
  });
}

function seedLead(store: Store): void {
  store.leads.set(LEAD_ID, {
    id: LEAD_ID,
    name: "Buyer Ali",
    phone: "03001234567",
    email: "buyer@example.com",
    societyIds: [SOCIETY_ID],
    categoryId: CATEGORY_ID,
    budgetPkr: 12_000_000,
    paymentPlanPreference: null,
    source: LeadSource.COMPARE,
    status: LeadStatus.NEW,
    notes: null,
    buyerUserId: BUYER_ID,
    assignedAdvisorId: null,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  });
}

function seedBuyerQuotes(store: Store): void {
  store.quotes.set(QUOTE_OWN, {
    id: QUOTE_OWN,
    leadId: LEAD_ID,
    societyId: SOCIETY_ID,
    categoryId: CATEGORY_ID,
    dealerId: DEALER_ID,
    dealerNetPkr: 9_600_000,
    quotedPricePkr: 10_000_000,
    spreadPkr: 400_000,
    tokenAmountPkr: 500_000,
    validUntil: new Date("2026-12-31T00:00:00.000Z"),
    status: QuoteStatus.SENT,
    paymentPlanLabel: null,
    installmentsDirect: true,
    createdById: ADVISOR_ID,
    buyerUserId: BUYER_ID,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  });
  store.quotes.set(QUOTE_OTHER, {
    id: QUOTE_OTHER,
    leadId: LEAD_ID,
    societyId: SOCIETY_ID,
    categoryId: CATEGORY_ID,
    dealerId: DEALER_ID,
    dealerNetPkr: 8_000_000,
    quotedPricePkr: 8_500_000,
    spreadPkr: 500_000,
    tokenAmountPkr: 400_000,
    validUntil: new Date("2026-12-31T00:00:00.000Z"),
    status: QuoteStatus.SENT,
    paymentPlanLabel: null,
    installmentsDirect: true,
    createdById: ADVISOR_ID,
    buyerUserId: OTHER_BUYER_ID,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  });
}

function seedFulfillment(store: Store): void {
  store.fulfillmentOrders.set("fo_1", {
    id: "fo_1",
    quoteId: QUOTE_OWN,
    dealerId: DEALER_ID,
    orderRef: "FO-TEST001",
    status: FulfillmentStatus.PENDING,
    plotRef: null,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  });
}

function seedNetSheet(store: Store): void {
  store.dealerNetSheets.set("dns_1", {
    id: "dns_1",
    dealerId: DEALER_ID,
    categoryId: CATEGORY_ID,
    netPricePkr: 9_600_000,
    paymentPlanTerms: "20% down",
    refreshedAt: FIXED_NOW,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  });
}

function assertJsonOmitsBuyerPiiKeys(payload: unknown): void {
  const json = JSON.stringify(payload);
  for (const field of BUYER_PII_FIELDS) {
    // Exact JSON object keys only — societyName / categoryLabel values are fine.
    expect(json).not.toMatch(new RegExp(`"${field}"\\s*:`));
  }
}

describe("leadRouter.create", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
  });

  it("creates a lead and LEAD_CREATED ledger event for valid public input", async () => {
    const caller = createTestCaller({ db, session: null });

    const lead = await caller.lead.create({
      name: "Sara Khan",
      phone: "03009876543",
      email: "sara@example.com",
      societyIds: [SOCIETY_ID],
      source: LeadSource.COMPARE,
      budgetPkr: 15_000_000,
    });

    expect(lead.status).toBe(LeadStatus.NEW);
    expect(lead.name).toBe("Sara Khan");
    expect(store.leads.size).toBe(1);

    const events = [...store.ledgerEvents.values()];
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("LEAD_CREATED");
    expect(events[0]?.entityId).toBe(lead.id);
  });

  it("rejects when the injected rate limiter denies the IP bucket", async () => {
    const caller = createTestCaller({
      db,
      session: null,
      clientId: "203.0.113.10",
      rateLimiter: {
        limit: async () => ({ success: false }),
      },
    });

    await expect(
      caller.lead.create({
        name: "Rate Limited",
        phone: "03001112233",
        societyIds: [SOCIETY_ID],
        source: LeadSource.COMPARE,
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof TRPCError && error.code === "TOO_MANY_REQUESTS",
    );
    expect(store.leads.size).toBe(0);
  });
});

describe("quoteRouter.createDraft / send", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedSocietyAndCategory(store);
    seedDealer(store);
    seedLead(store);
  });

  const draftInput = {
    leadId: LEAD_ID,
    societyId: SOCIETY_ID,
    categoryId: CATEGORY_ID,
    dealerId: DEALER_ID,
    dealerNetPkr: 9_600_000,
    quotedPricePkr: 10_000_000,
    tokenAmountPkr: 500_000,
    validUntil: "2026-12-31T00:00:00.000Z",
  };

  it("allows ops to create a draft and send it with margin fields", async () => {
    const ops = createTestCaller({
      db,
      session: salesAdvisorSession(ADVISOR_ID),
    });

    const draft = await ops.quote.createDraft(draftInput);
    expect(draft.status).toBe(QuoteStatus.DRAFT);
    expect(draft.dealerNetPkr).toBe(9_600_000);
    expect(draft.spreadPkr).toBe(400_000);
    expect(store.leads.get(LEAD_ID)?.status).toBe(LeadStatus.QUOTED);

    const sent = await ops.quote.send({
      quoteId: draft.id,
      buyerUserId: BUYER_ID,
    });
    expect(sent.status).toBe(QuoteStatus.SENT);
    expect(sent.buyerUserId).toBe(BUYER_ID);
    expect(sent.dealerNetPkr).toBe(9_600_000);

    const events = [...store.ledgerEvents.values()];
    expect(events.some((event) => event.type === "QUOTE_SENT")).toBe(true);
  });

  it("rejects createDraft and send from buyer and dealer roles", async () => {
    const buyer = createTestCaller({ db, session: buyerSession(BUYER_ID) });
    const dealer = createTestCaller({
      db,
      session: dealerSession(DEALER_USER_ID),
    });

    await expect(buyer.quote.createDraft(draftInput)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof TRPCError && error.code === "FORBIDDEN",
    );
    await expect(dealer.quote.createDraft(draftInput)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof TRPCError && error.code === "FORBIDDEN",
    );

    store.quotes.set("quote_draft", {
      id: "quote_draft",
      leadId: LEAD_ID,
      societyId: SOCIETY_ID,
      categoryId: CATEGORY_ID,
      dealerId: DEALER_ID,
      dealerNetPkr: 9_600_000,
      quotedPricePkr: 10_000_000,
      spreadPkr: 400_000,
      tokenAmountPkr: 500_000,
      validUntil: new Date("2026-12-31T00:00:00.000Z"),
      status: QuoteStatus.DRAFT,
      paymentPlanLabel: null,
      installmentsDirect: false,
      createdById: ADVISOR_ID,
      buyerUserId: null,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });

    await expect(
      buyer.quote.send({ quoteId: "quote_draft" }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof TRPCError && error.code === "FORBIDDEN",
    );
    await expect(
      dealer.quote.send({ quoteId: "quote_draft" }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof TRPCError && error.code === "FORBIDDEN",
    );
  });

  it("never includes dealerNetPkr or spreadPkr on buyer-facing quote DTOs", async () => {
    seedBuyerQuotes(store);
    const buyer = createTestCaller({ db, session: buyerSession(BUYER_ID) });

    const listed = await buyer.quote.listForBuyer();
    assertNoForbiddenBuyerFields(listed);
    for (const field of FORBIDDEN_BUYER_FIELDS) {
      expect(JSON.stringify(listed)).not.toContain(`"${field}"`);
    }

    const accepted = await buyer.quote.accept({ quoteId: QUOTE_OWN });
    assertNoForbiddenBuyerFields(accepted);
    expect(accepted).not.toHaveProperty("dealerNetPkr");
    expect(accepted).not.toHaveProperty("spreadPkr");
  });
});

describe("quoteRouter.listForBuyer", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedSocietyAndCategory(store);
    seedDealer(store);
    seedLead(store);
    seedBuyerQuotes(store);
  });

  it("returns only quotes owned by the authenticated buyer", async () => {
    const buyer = createTestCaller({ db, session: buyerSession(BUYER_ID) });
    const quotes = await buyer.quote.listForBuyer();

    expect(quotes).toHaveLength(1);
    expect(quotes[0]?.id).toBe(QUOTE_OWN);
    expect(quotes.every((quote) => quote.buyerUserId === BUYER_ID)).toBe(true);
    assertNoForbiddenBuyerFields(quotes);
  });
});

describe("fulfillmentRouter.listForDealer", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedSocietyAndCategory(store);
    seedDealer(store);
    seedLead(store);
    seedBuyerQuotes(store);
    seedFulfillment(store);
  });

  it("returns fulfillment rows without buyer name, phone, CNIC, or email keys", async () => {
    const dealer = createTestCaller({
      db,
      session: dealerSession(DEALER_USER_ID),
    });

    const orders = await dealer.fulfillment.listForDealer();
    expect(orders).toHaveLength(1);
    expect(orders[0]?.orderRef).toBe("FO-TEST001");
    expect(orders[0]?.societyName).toBe("Bahria Town");
    expect(orders[0]?.categoryLabel).toContain("5 Marla");

    assertJsonOmitsBuyerPiiKeys(orders);
    expect(JSON.stringify(orders)).not.toContain("Buyer Ali");
    expect(JSON.stringify(orders)).not.toContain("03001234567");
    expect(JSON.stringify(orders)).not.toContain("buyer@example.com");
  });
});

describe("dealerNetSheetRouter.listMatrix", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedSocietyAndCategory(store);
    seedDealer(store);
    seedNetSheet(store);
  });

  it("allows ops to read the net-price matrix", async () => {
    const ops = createTestCaller({
      db,
      session: salesAdvisorSession(ADVISOR_ID),
    });

    const matrix = await ops.dealerNetSheet.listMatrix();
    expect(matrix).toHaveLength(1);
    expect(matrix[0]?.netPricePkr).toBe(9_600_000);
    expect(matrix[0]?.dealerAgencyName).toBe("Alpha Realty");
    expect(matrix[0]?.listPricePkr).toBe(10_125_000);
  });

  it("rejects buyer and dealer callers with FORBIDDEN", async () => {
    const buyer = createTestCaller({ db, session: buyerSession(BUYER_ID) });
    const dealer = createTestCaller({
      db,
      session: dealerSession(DEALER_USER_ID),
    });

    await expect(buyer.dealerNetSheet.listMatrix()).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof TRPCError && error.code === "FORBIDDEN",
    );
    await expect(dealer.dealerNetSheet.listMatrix()).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof TRPCError && error.code === "FORBIDDEN",
    );
  });
});
