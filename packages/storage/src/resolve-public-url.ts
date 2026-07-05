/** Whether `value` is an absolute http(s) URL (external CDN, not a storage key). */
export function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Resolves a storage key to a public URL. Absolute URLs pass through unchanged so
 * seed/demo fixtures can reference third-party CDN assets (e.g. Urban City).
 */
export function resolvePublicUrl(baseUrl: string, key: string): string {
  if (isAbsoluteHttpUrl(key)) return key;
  return `${baseUrl.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}
