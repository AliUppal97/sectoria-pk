/**
 * Stub storage URL resolver for society profile v2 (ADR-009).
 * Session S3 will replace these with real presigned/CDN URLs.
 */

const MOCK_PUBLIC_BASE = "https://storage.sectoria.pk";

/** Resolves a public-read object key to a CDN URL. */
export function getPublicUrl(storageKey: string): string {
  return `${MOCK_PUBLIC_BASE}/${storageKey}`;
}

/** Mints a short-lived signed download URL (stub — no real signing yet). */
export function getSignedDownloadUrl(
  storageKey: string,
  _ttlSeconds = 300,
): string {
  return `${MOCK_PUBLIC_BASE}/signed/${storageKey}?expires=${String(_ttlSeconds)}`;
}
