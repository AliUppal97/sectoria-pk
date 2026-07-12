import { beforeEach, describe, expect, it } from "vitest";
import { createInMemoryDb, type Store } from "./helpers/in-memory-db.js";
import {
  buyerSession,
  createTestCaller,
  societyAdminSession,
  superAdminSession,
} from "./helpers/test-context.js";
import {
  assertNoForbiddenBuyerFields,
  FORBIDDEN_BUYER_FIELDS,
} from "../lib/society-profile-dto.js";

const SOCIETY_ID = "soc_1";
const OTHER_SOCIETY_ID = "soc_other";
const DRAFT_SOCIETY_ID = "soc_draft";

function seedSociety(store: Store): void {
  store.societies.set(SOCIETY_ID, {
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
    heroImageUrl: null,
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
    startingPricePkr: null,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
  });
}

function seedDraftSocietyWithProfileContent(store: Store): void {
  store.societies.set(DRAFT_SOCIETY_ID, {
    id: DRAFT_SOCIETY_ID,
    slug: "draft-society",
    name: "Draft Society",
    city: "Lahore",
    citySlug: "lahore",
    authority: "LDA",
    verificationTier: "PENDING",
    description: "Not yet published.",
    amenities: [],
    developmentStage: "Planning",
    developmentPct: 0,
    heroImageUrl: null,
    latitude: null,
    longitude: null,
    lopReferenceNo: null,
    nocReferenceNo: null,
    hsmsLinked: false,
    totalLandKanal: null,
    developedLandKanal: null,
    bookingStatus: "OPEN",
    publishStatus: "DRAFT",
    publishedAt: null,
    createdById: null,
    startingPricePkr: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
  });
  store.profileV2.societyMedia.set("media_draft", {
    id: "media_draft",
    societyId: DRAFT_SOCIETY_ID,
    kind: "GALLERY",
    storageKey: "societies/draft/gallery.jpg",
    alt: "Draft gallery",
    caption: null,
    capturedAt: null,
    sortOrder: 0,
    width: null,
    height: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
  });
  store.profileV2.societyDocument.set("doc_draft", {
    id: "doc_draft",
    societyId: DRAFT_SOCIETY_ID,
    kind: "BROCHURE",
    title: "Draft brochure",
    storageKey: "societies/draft/brochure.pdf",
    fileSize: 512,
    contentType: "application/pdf",
    isPublic: true,
    sortOrder: 0,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
  });
}

describe("society profile v2 routers — ownership & access", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedSociety(store);
  });

  it("public listForSociety procedures reject DRAFT societies with NOT_FOUND", async () => {
    seedDraftSocietyWithProfileContent(store);
    const caller = createTestCaller({ db, session: null });
    const publicListCalls = [
      () => caller.media.listForSociety({ societyId: DRAFT_SOCIETY_ID }),
      () => caller.document.listForSociety({ societyId: DRAFT_SOCIETY_ID }),
      () =>
        caller.societyFeature.listAmenitiesForSociety({
          societyId: DRAFT_SOCIETY_ID,
        }),
      () =>
        caller.societyFeature.listHighlightsForSociety({
          societyId: DRAFT_SOCIETY_ID,
        }),
      () => caller.landmark.listForSociety({ societyId: DRAFT_SOCIETY_ID }),
      () => caller.milestone.listForSociety({ societyId: DRAFT_SOCIETY_ID }),
    ];
    for (const call of publicListCalls) {
      await expect(call()).rejects.toMatchObject({ code: "NOT_FOUND" });
    }
  });

  it("public media payloads expose url and omit storageKey", async () => {
    store.profileV2.societyMedia.set("media_1", {
      id: "media_1",
      societyId: SOCIETY_ID,
      kind: "HERO",
      storageKey: "societies/dha/hero.jpg",
      alt: "Hero",
      caption: null,
      capturedAt: null,
      sortOrder: 0,
      width: 1200,
      height: 800,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    const caller = createTestCaller({ db, session: null });
    const media = await caller.media.listForSociety({ societyId: SOCIETY_ID });
    expect(media).toHaveLength(1);
    expect(media[0]).toHaveProperty("url");
    expect(media[0]).not.toHaveProperty("storageKey");
  });

  it("rejects cross-society media create with FORBIDDEN", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession("usr_admin", OTHER_SOCIETY_ID),
    });
    await expect(
      caller.media.create({
        societyId: SOCIETY_ID,
        kind: "GALLERY",
        storageKey: "societies/dha/gallery-1.jpg",
        alt: "Gallery photo",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("document.listForSociety excludes private docs for public callers", async () => {
    store.profileV2.societyDocument.set("doc_public", {
      id: "doc_public",
      societyId: SOCIETY_ID,
      kind: "BROCHURE",
      title: "Brochure",
      storageKey: "societies/dha/brochure.pdf",
      fileSize: 1024,
      contentType: "application/pdf",
      isPublic: true,
      sortOrder: 0,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    store.profileV2.societyDocument.set("doc_private", {
      id: "doc_private",
      societyId: SOCIETY_ID,
      kind: "LOP",
      title: "LOP",
      storageKey: "societies/dha/lop.pdf",
      fileSize: 2048,
      contentType: "application/pdf",
      isPublic: false,
      sortOrder: 1,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const caller = createTestCaller({ db, session: null });
    const docs = await caller.document.listForSociety({ societyId: SOCIETY_ID });
    expect(docs).toHaveLength(1);
    expect(docs[0]?.title).toBe("Brochure");
    expect(docs[0]).toHaveProperty("url");
    expect(docs[0]).not.toHaveProperty("storageKey");
  });

  it("developer.create rejects non-super-admin callers", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession("usr_admin", SOCIETY_ID),
    });
    await expect(
      caller.developer.create({
        slug: "urban-developers",
        name: "Urban Developers",
        description: "A trusted builder.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("article.create rejects non-super-admin callers", async () => {
    const caller = createTestCaller({
      db,
      session: buyerSession("usr_buyer"),
    });
    await expect(
      caller.article.create({
        slug: "why-invest",
        title: "Why invest",
        excerpt: "Summary",
        body: "Full article",
        authorName: "Sectoria Editorial",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns NOT_FOUND for unpublished articles via getBySlug", async () => {
    store.profileV2.article.set("art_draft", {
      id: "art_draft",
      slug: "draft-only",
      title: "Draft",
      excerpt: "Hidden",
      body: "Body",
      coverKey: null,
      authorName: "Editorial",
      publishedAt: null,
      isPublished: false,
      societyId: null,
      developerId: null,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const caller = createTestCaller({ db, session: null });
    await expect(
      caller.article.getBySlug({ slug: "draft-only" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lets super-admin create a developer and an article", async () => {
    const caller = createTestCaller({
      db,
      session: superAdminSession("usr_super"),
    });
    const developer = await caller.developer.create({
      slug: "urban-developers",
      name: "Urban Developers",
      description: "A trusted builder.",
    });
    expect(developer.slug).toBe("urban-developers");

    const article = await caller.article.create({
      slug: "why-invest",
      title: "Why invest",
      excerpt: "Summary",
      body: "Full article",
      authorName: "Sectoria Editorial",
      isPublished: true,
      publishedAt: "2026-06-01T00:00:00.000Z",
    });
    expect(article.isPublished).toBe(true);
  });

  it("public profile payloads never include dealer net/commission/contact fields", async () => {
    store.profileV2.societyMedia.set("media_1", {
      id: "media_1",
      societyId: SOCIETY_ID,
      kind: "HERO",
      storageKey: "societies/dha/hero.jpg",
      alt: "Hero",
      caption: null,
      capturedAt: null,
      sortOrder: 0,
      width: 1200,
      height: 800,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    store.profileV2.societyDocument.set("doc_public", {
      id: "doc_public",
      societyId: SOCIETY_ID,
      kind: "BROCHURE",
      title: "Brochure",
      storageKey: "societies/dha/brochure.pdf",
      fileSize: 1024,
      contentType: "application/pdf",
      isPublic: true,
      sortOrder: 0,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    store.profileV2.developer.set("dev_1", {
      id: "dev_1",
      slug: "urban-developers",
      name: "Urban Developers",
      description: "Builder",
      logoKey: null,
      websiteUrl: null,
      foundedYear: 2010,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    });
    store.profileV2.article.set("art_1", {
      id: "art_1",
      slug: "why-invest",
      title: "Why invest",
      excerpt: "Summary",
      body: "Body",
      coverKey: null,
      authorName: "Editorial",
      publishedAt: new Date("2026-06-01T00:00:00.000Z"),
      isPublished: true,
      societyId: SOCIETY_ID,
      developerId: null,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const caller = createTestCaller({ db, session: null });
    const payloads = [
      await caller.media.listForSociety({ societyId: SOCIETY_ID }),
      await caller.document.listForSociety({ societyId: SOCIETY_ID }),
      await caller.societyFeature.listAmenitiesForSociety({
        societyId: SOCIETY_ID,
      }),
      await caller.societyFeature.listHighlightsForSociety({
        societyId: SOCIETY_ID,
      }),
      await caller.landmark.listForSociety({ societyId: SOCIETY_ID }),
      await caller.milestone.listForSociety({ societyId: SOCIETY_ID }),
      await caller.developer.list(),
      await caller.developer.getBySlug({ slug: "urban-developers" }),
      await caller.article.list({ societyId: SOCIETY_ID }),
      await caller.article.getBySlug({ slug: "why-invest" }),
    ];

    for (const payload of payloads) {
      assertNoForbiddenBuyerFields(payload);
    }

    const serialized = JSON.stringify(payloads);
    for (const field of FORBIDDEN_BUYER_FIELDS) {
      expect(serialized).not.toContain(`"${field}"`);
    }
  });

  it("lets the owning society admin create media", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession("usr_admin", SOCIETY_ID),
    });
    const created = await caller.media.create({
      societyId: SOCIETY_ID,
      kind: "GALLERY",
      storageKey: "societies/dha/gallery-1.jpg",
      alt: "Gallery photo",
    });
    expect(created.storageKey).toBe("societies/dha/gallery-1.jpg");
  });
});
