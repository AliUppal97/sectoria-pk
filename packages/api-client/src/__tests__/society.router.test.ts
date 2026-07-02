import { beforeEach, describe, expect, it } from "vitest";
import {
  createInMemoryDb,
  Store,
  type CategoryRow,
  type SocietyRow,
} from "./helpers/in-memory-db.js";
import {
  buyerSession,
  createTestCaller,
  salesAdvisorSession,
  societyAdminSession,
  superAdminSession,
} from "./helpers/test-context.js";

const SOCIETY_ID = "soc_1";

/** A fully-complete, publishable society row (all required fields present). */
function makeSociety(overrides: Partial<SocietyRow> = {}): SocietyRow {
  return {
    id: SOCIETY_ID,
    slug: "dha-lahore",
    name: "DHA Lahore",
    city: "Lahore",
    citySlug: "lahore",
    authority: "LDA",
    verificationTier: "VERIFIED",
    description: "A verified society.",
    amenities: ["parks"],
    developmentStage: "Possession Underway",
    developmentPct: 80,
    heroImageUrl: "https://images.sectoria.pk/dha-lahore.jpg",
    latitude: 31.4697,
    longitude: 74.4117,
    lopReferenceNo: "LOP-LDA-2024-100",
    nocReferenceNo: "NOC-LDA-2024-200",
    hsmsLinked: false,
    totalLandKanal: null,
    developedLandKanal: null,
    bookingStatus: "OPEN",
    publishStatus: "PUBLISHED",
    publishedAt: new Date("2026-05-01T00:00:00.000Z"),
    createdById: null,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    ...overrides,
  };
}

function makeCategory(overrides: Partial<CategoryRow> & { id: string; societyId: string }): CategoryRow {
  return {
    slug: "phase-1-block-a-5-marla",
    phase: "Phase 1",
    block: "Block A",
    plotType: "RESIDENTIAL",
    sizeLabel: "5 Marla",
    sizeSqft: 1361,
    pricePerSqft: "20000",
    totalUnits: 40,
    availableUnits: 40,
    allocationStrategy: "FIFO",
    fbrValuationZone: "Zone-I",
    ...overrides,
  };
}

function seedSociety(store: Store, overrides: Partial<SocietyRow> = {}): void {
  const society = makeSociety(overrides);
  store.societies.set(society.id, society);
}

describe("societyRouter — reads & ownership", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedSociety(store);
  });

  it("lists published societies for an anonymous (public) caller", async () => {
    const caller = createTestCaller({ db, session: null });
    const societies = await caller.society.list();
    expect(societies).toHaveLength(1);
    expect(societies[0]?.slug).toBe("dha-lahore");
  });

  it("excludes DRAFT and ARCHIVED societies from the public list", async () => {
    seedSociety(store, { id: "soc_draft", slug: "draft-town", publishStatus: "DRAFT" });
    seedSociety(store, { id: "soc_arch", slug: "old-town", publishStatus: "ARCHIVED" });
    const caller = createTestCaller({ db, session: null });
    const societies = await caller.society.list();
    expect(societies.map((s) => s.slug)).toEqual(["dha-lahore"]);
  });

  it("returns NOT_FOUND for a non-PUBLISHED society via getBySlug", async () => {
    seedSociety(store, { id: "soc_draft", slug: "draft-town", publishStatus: "DRAFT" });
    const caller = createTestCaller({ db, session: null });
    await expect(
      caller.society.getBySlug({ slug: "draft-town" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lets the owning admin update their society", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession("usr_admin", SOCIETY_ID),
    });
    const updated = await caller.society.update({
      societyId: SOCIETY_ID,
      data: { developmentPct: 95 },
    });
    expect(updated.developmentPct).toBe(95);
  });

  it("denies an admin of a different society (role passes, ownership fails)", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession("usr_other", "soc_other"),
    });
    await expect(
      caller.society.update({
        societyId: SOCIETY_ID,
        data: { developmentPct: 1 },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(store.societies.get(SOCIETY_ID)?.developmentPct).toBe(80);
  });

  it("denies portal overview for another society id in the input", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession("usr_admin", SOCIETY_ID),
    });
    await expect(
      caller.society.getPortalOverview({ societyId: "soc_other" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("societyRouter — create (M0.2)", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
  });

  const validInput = {
    name: "Green Valley",
    slug: "green-valley",
    citySlug: "islamabad",
    authority: "CDA",
  };

  it("lets an ops (sales advisor) user create a DRAFT society and audits it", async () => {
    const caller = createTestCaller({ db, session: salesAdvisorSession("usr_ops") });
    const created = await caller.society.create(validInput);

    expect(created.publishStatus).toBe("DRAFT");
    expect(created.city).toBe("Islamabad");
    expect(created.createdById).toBe("usr_ops");
    expect(created.completeness.isPublishable).toBe(false);

    const events = [...store.ledgerEvents.values()];
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("SOCIETY_CREATED");
    expect(events[0]?.entityId).toBe(created.id);
  });

  it("rejects creation by a buyer (onboarding is ops-only, never self-service)", async () => {
    const caller = createTestCaller({ db, session: buyerSession("usr_buyer") });
    await expect(caller.society.create(validInput)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects a duplicate slug with CONFLICT", async () => {
    seedSociety(store, { id: "soc_1", slug: "green-valley" });
    const caller = createTestCaller({ db, session: salesAdvisorSession("usr_ops") });
    await expect(caller.society.create(validInput)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rejects a free-text city not in the reference set", async () => {
    const caller = createTestCaller({ db, session: salesAdvisorSession("usr_ops") });
    await expect(
      caller.society.create({ ...validInput, citySlug: "atlantis" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("societyRouter — publish gate (M0.4)", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
  });

  it("blocks publishing until the completeness minimum is met", async () => {
    seedSociety(store, {
      publishStatus: "DRAFT",
      heroImageUrl: null,
      lopReferenceNo: null,
    });
    const caller = createTestCaller({ db, session: salesAdvisorSession("usr_ops") });
    await expect(
      caller.society.setPublishStatus({
        societyId: SOCIETY_ID,
        status: "PUBLISHED",
      }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(store.societies.get(SOCIETY_ID)?.publishStatus).toBe("DRAFT");
  });

  it("publishes a complete society and emits a SOCIETY_PUBLISHED event", async () => {
    seedSociety(store, { publishStatus: "DRAFT", publishedAt: null });
    const caller = createTestCaller({ db, session: salesAdvisorSession("usr_ops") });
    const result = await caller.society.setPublishStatus({
      societyId: SOCIETY_ID,
      status: "PUBLISHED",
    });
    expect(result.publishStatus).toBe("PUBLISHED");
    expect(result.publishedAt).not.toBeNull();

    const events = [...store.ledgerEvents.values()];
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("SOCIETY_PUBLISHED");
  });

  it("archiving emits a SOCIETY_ARCHIVED event", async () => {
    seedSociety(store, { publishStatus: "PUBLISHED" });
    const caller = createTestCaller({ db, session: salesAdvisorSession("usr_ops") });
    await caller.society.setPublishStatus({
      societyId: SOCIETY_ID,
      status: "ARCHIVED",
    });
    const events = [...store.ledgerEvents.values()];
    expect(events[0]?.type).toBe("SOCIETY_ARCHIVED");
    expect(store.societies.get(SOCIETY_ID)?.publishStatus).toBe("ARCHIVED");
  });
});

describe("societyRouter — assignAdmin (M0.2)", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedSociety(store);
    store.users.set("usr_sa", {
      id: "usr_sa",
      role: "SOCIETY_ADMIN",
      societyId: null,
      atlStatus: "FILER",
      nadraVerified: true,
      cnicEncrypted: null,
      ntnEncrypted: null,
      atlVerifiedAt: null,
    });
  });

  it("is super-admin only (an ops sales advisor is rejected)", async () => {
    const caller = createTestCaller({ db, session: salesAdvisorSession("usr_ops") });
    await expect(
      caller.society.assignAdmin({ societyId: SOCIETY_ID, userId: "usr_sa" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("links a SOCIETY_ADMIN user to a society", async () => {
    const caller = createTestCaller({ db, session: superAdminSession("usr_super") });
    const result = await caller.society.assignAdmin({
      societyId: SOCIETY_ID,
      userId: "usr_sa",
    });
    expect(result.adminUserId).toBe("usr_sa");
    expect(store.users.get("usr_sa")?.societyId).toBe(SOCIETY_ID);
  });

  it("rejects assigning a non-SOCIETY_ADMIN user", async () => {
    store.users.set("usr_buyer", {
      id: "usr_buyer",
      role: "BUYER",
      societyId: null,
      atlStatus: "FILER",
      nadraVerified: true,
      cnicEncrypted: null,
      ntnEncrypted: null,
      atlVerifiedAt: null,
    });
    const caller = createTestCaller({ db, session: superAdminSession("usr_super") });
    await expect(
      caller.society.assignAdmin({ societyId: SOCIETY_ID, userId: "usr_buyer" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("clears all linked admins when userId is null", async () => {
    store.users.get("usr_sa")!.societyId = SOCIETY_ID;
    const caller = createTestCaller({ db, session: superAdminSession("usr_super") });
    const result = await caller.society.assignAdmin({
      societyId: SOCIETY_ID,
      userId: null,
    });
    expect(result.adminUserId).toBeNull();
    expect(store.users.get("usr_sa")?.societyId).toBeNull();
  });
});

describe("societyRouter — importBatch (M0.5)", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
  });

  const rows = [
    { name: "Palm City", slug: "palm-city", citySlug: "karachi", authority: "SBCA" },
    { name: "River Gardens", slug: "river-gardens", citySlug: "multan", authority: "MDA" },
  ];

  it("is super-admin only", async () => {
    const caller = createTestCaller({ db, session: salesAdvisorSession("usr_ops") });
    await expect(
      caller.society.importBatch({ dryRun: true, rows }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("dry-run reports outcomes without writing", async () => {
    const caller = createTestCaller({ db, session: superAdminSession("usr_super") });
    const report = await caller.society.importBatch({ dryRun: true, rows });
    expect(report.dryRun).toBe(true);
    expect(report.results).toHaveLength(2);
    expect(report.results.every((r) => r.outcome === "created")).toBe(true);
    expect(store.societies.size).toBe(0);
  });

  it("is idempotent: a re-run updates rather than duplicates", async () => {
    const caller = createTestCaller({ db, session: superAdminSession("usr_super") });

    const first = await caller.society.importBatch({ dryRun: false, rows });
    expect(first.summary.created).toBe(2);
    expect(store.societies.size).toBe(2);
    for (const society of store.societies.values()) {
      expect(society.publishStatus).toBe("DRAFT");
    }

    const second = await caller.society.importBatch({ dryRun: false, rows });
    expect(second.summary.updated).toBe(2);
    expect(second.summary.created).toBe(0);
    expect(store.societies.size).toBe(2);
  });
});

describe("societyRouter — directory scale (M0.7)", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
  });

  function seedPublished(count: number): void {
    for (let i = 0; i < count; i += 1) {
      const id = `soc_${i}`;
      store.societies.set(
        id,
        makeSociety({
          id,
          slug: `society-${i}`,
          name: `Society ${String(i).padStart(2, "0")}`,
          publishStatus: "PUBLISHED",
        }),
      );
      store.categories.set(`cat_${i}`, makeCategory({ id: `cat_${i}`, societyId: id }));
    }
  }

  it("runs a bounded number of queries regardless of society count (no fan-out)", async () => {
    const caller = createTestCaller({ db, session: null });

    seedPublished(3);
    store.dbCallCount = 0;
    await caller.society.listSummaries({ limit: 24 });
    const callsForThree = store.dbCallCount;

    seedPublished(10);
    store.dbCallCount = 0;
    await caller.society.listSummaries({ limit: 24 });
    const callsForTen = store.dbCallCount;

    expect(callsForThree).toBe(callsForTen);
    expect(callsForThree).toBeLessThanOrEqual(3);
  });

  it("cursor-paginates the directory", async () => {
    seedPublished(3);
    const caller = createTestCaller({ db, session: null });

    const firstPage = await caller.society.listSummaries({ limit: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await caller.society.listSummaries({
      limit: 2,
      cursor: firstPage.nextCursor,
    });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.nextCursor).toBeNull();
  });

  it("derives category count and starting price without per-society queries", async () => {
    seedPublished(1);
    const caller = createTestCaller({ db, session: null });
    const page = await caller.society.listSummaries({ limit: 24 });
    expect(page.items[0]?.categoryCount).toBe(1);
    expect(page.items[0]?.startingPrice).toBe(1361 * 20000);
  });

  it("facets counts run in a single groupBy query", async () => {
    seedPublished(2);
    const caller = createTestCaller({ db, session: null });
    store.dbCallCount = 0;
    const facets = await caller.society.facets();
    expect(store.dbCallCount).toBe(1);
    expect(facets.cities[0]?.label).toBe("Lahore");
    expect(facets.authorities[0]?.value).toBe("LDA");
  });
});
