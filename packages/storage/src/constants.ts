/** Default signed-download TTL (5 minutes) per ADR-009 / storage.md. */
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;

/** Presigned PUT URLs expire after 15 minutes. */
export const DEFAULT_UPLOAD_URL_TTL_SECONDS = 900;

/** Local mock adapter base URL when STORAGE_PUBLIC_BASE_URL is unset. */
export const LOCAL_STORAGE_BASE_URL = "http://127.0.0.1:3099";

/** Parses the `expires` query param from a local signed URL (for tests). */
export function parseSignedUrlExpiry(signedUrl: string): number | null {
  try {
    const expires = new URL(signedUrl).searchParams.get("expires");
    if (!expires) return null;
    const parsed = Number(expires);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Returns true when a signed URL's expiry timestamp is in the past. */
export function isSignedUrlExpired(
  signedUrl: string,
  nowMs: number,
): boolean {
  const expiresMs = parseSignedUrlExpiry(signedUrl);
  if (expiresMs === null) return false;
  return expiresMs <= nowMs;
}
