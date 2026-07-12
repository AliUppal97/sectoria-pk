import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SIGNED_URL_TTL_SECONDS,
  isSignedUrlExpired,
  parseSignedUrlExpiry,
  SOCIETY_DOCUMENT_MAX_BYTES,
} from "@sectoria/storage";
import { createInMemoryDb, type Store } from "./helpers/in-memory-db.js";
import {
  createTestCaller,
  societyAdminSession,
} from "./helpers/test-context.js";

const SOCIETY_ID = "soc_1";
const OTHER_SOCIETY_ID = "soc_other";

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

describe("storage router", () => {
  let store: Store;
  let db: ReturnType<typeof createInMemoryDb>["db"];

  beforeEach(() => {
    const fake = createInMemoryDb();
    store = fake.store;
    db = fake.db;
    seedSociety(store);
  });

  it("rejects disallowed content-type on requestUploadUrl", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession("usr_admin", SOCIETY_ID),
    });
    await expect(
      caller.storage.requestUploadUrl({
        societyId: SOCIETY_ID,
        contentType: "text/plain" as "image/jpeg",
        fileSize: 1024,
        visibility: "public",
        resourceType: "media",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects oversized files on requestUploadUrl", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession("usr_admin", SOCIETY_ID),
    });
    await expect(
      caller.storage.requestUploadUrl({
        societyId: SOCIETY_ID,
        contentType: "image/jpeg",
        fileSize: SOCIETY_DOCUMENT_MAX_BYTES + 1,
        visibility: "public",
        resourceType: "media",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("mints a presigned upload URL for the owning society admin", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession("usr_admin", SOCIETY_ID),
    });
    const result = await caller.storage.requestUploadUrl({
      societyId: SOCIETY_ID,
      contentType: "image/png",
      fileSize: 2048,
      visibility: "public",
      resourceType: "media",
    });
    expect(result.uploadUrl).toContain("/upload/societies/");
    expect(result.storageKey).toMatch(/^societies\/soc_1\/media\//);
    expect(result.expiresAt).toBeTruthy();
  });

  it("rejects cross-society upload URL requests with FORBIDDEN", async () => {
    const caller = createTestCaller({
      db,
      session: societyAdminSession("usr_admin", OTHER_SOCIETY_ID),
    });
    await expect(
      caller.storage.requestUploadUrl({
        societyId: SOCIETY_ID,
        contentType: "image/jpeg",
        fileSize: 1024,
        visibility: "public",
        resourceType: "media",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("requires auth for private document download URLs", async () => {
    store.profileV2.societyDocument.set("doc_private", {
      id: "doc_private",
      societyId: SOCIETY_ID,
      kind: "LOP",
      title: "LOP",
      storageKey: "societies/dha/lop.pdf",
      fileSize: 2048,
      contentType: "application/pdf",
      isPublic: false,
      sortOrder: 0,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const caller = createTestCaller({ db, session: null });
    await expect(
      caller.document.getDownloadUrl({ documentId: "doc_private" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("mints expiring signed URLs for private docs after ownership check", async () => {
    store.profileV2.societyDocument.set("doc_private", {
      id: "doc_private",
      societyId: SOCIETY_ID,
      kind: "LOP",
      title: "LOP",
      storageKey: "societies/dha/lop.pdf",
      fileSize: 2048,
      contentType: "application/pdf",
      isPublic: false,
      sortOrder: 0,
      createdAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    const caller = createTestCaller({
      db,
      session: societyAdminSession("usr_admin", SOCIETY_ID),
    });
    const result = await caller.document.getDownloadUrl({
      documentId: "doc_private",
    });
    expect(result.url).toContain("/signed/societies/dha/lop.pdf");
    expect(result.expiresInSeconds).toBe(DEFAULT_SIGNED_URL_TTL_SECONDS);

    const expiresMs = parseSignedUrlExpiry(result.url);
    expect(expiresMs).toBe(
      new Date("2026-06-01T00:00:00.000Z").getTime() +
        DEFAULT_SIGNED_URL_TTL_SECONDS * 1000,
    );
    expect(isSignedUrlExpired(result.url, expiresMs! + 1)).toBe(true);
  });
});
