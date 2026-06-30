import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryDb, Store } from "./helpers/in-memory-db.js";
import {
  createTestCaller,
  societyAdminSession,
} from "./helpers/test-context.js";

const SOCIETY_ID = "soc_1";

function seedSociety(store: Store): void {
  store.societies.set(SOCIETY_ID, {
    id: SOCIETY_ID,
    slug: "dha-lahore",
    name: "DHA Lahore",
    citySlug: "lahore",
    authority: "LDA",
    verificationTier: "VERIFIED",
    description: "A verified society.",
    amenities: ["parks"],
    developmentStage: "Possession Underway",
    developmentPct: 80,
    heroImageUrl: null,
    latitude: null,
    longitude: null,
  });
}

describe("societyRouter", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedSociety(store);
  });

  it("lists societies for an anonymous (public) caller", async () => {
    const caller = createTestCaller({ db, session: null });
    const societies = await caller.society.list();
    expect(societies).toHaveLength(1);
    expect(societies[0]?.slug).toBe("dha-lahore");
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
