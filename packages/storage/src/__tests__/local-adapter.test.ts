import { describe, expect, it } from "vitest";
import {
  DEFAULT_SIGNED_URL_TTL_SECONDS,
  isSignedUrlExpired,
  LocalStorageAdapter,
  parseSignedUrlExpiry,
} from "../index.js";

const FIXED_NOW = new Date("2026-06-01T00:00:00.000Z");

describe("LocalStorageAdapter", () => {
  const adapter = new LocalStorageAdapter({
    publicBaseUrl: "http://127.0.0.1:3099",
    now: () => FIXED_NOW,
  });

  it("resolves public URLs without cloud credentials", () => {
    expect(adapter.getPublicUrl("societies/soc_1/media/abc.jpg")).toBe(
      "http://127.0.0.1:3099/societies/soc_1/media/abc.jpg",
    );
  });

  it("passes through absolute CDN URLs unchanged", () => {
    const cdn =
      "https://cdn.prod.website-files.com/example/hero.avif";
    expect(adapter.getPublicUrl(cdn)).toBe(cdn);
  });

  it("mints presigned upload URLs with content type and expiry", async () => {
    const result = await adapter.getUploadUrl({
      key: "societies/soc_1/media/abc.jpg",
      contentType: "image/jpeg",
      bucket: "public",
    });
    expect(result.url).toContain("/upload/societies/soc_1/media/abc.jpg");
    expect(result.url).toContain("contentType=image%2Fjpeg");
    expect(result.expiresAt.getTime()).toBeGreaterThan(FIXED_NOW.getTime());
  });

  it("mints signed download URLs that expire after the TTL", async () => {
    const url = await adapter.getSignedDownloadUrl({
      key: "societies/soc_1/documents/lop.pdf",
      ttlSeconds: DEFAULT_SIGNED_URL_TTL_SECONDS,
      bucket: "private",
    });
    const expiresMs = parseSignedUrlExpiry(url);
    expect(expiresMs).toBe(
      FIXED_NOW.getTime() + DEFAULT_SIGNED_URL_TTL_SECONDS * 1000,
    );
    expect(isSignedUrlExpired(url, expiresMs! - 1)).toBe(false);
    expect(isSignedUrlExpired(url, expiresMs! + 1)).toBe(true);
  });
});
