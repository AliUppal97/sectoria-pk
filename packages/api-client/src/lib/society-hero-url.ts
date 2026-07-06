import type { StorageAdapter } from "@sectoria/storage";

/** Seed placeholder host — URLs here do not resolve in dev. */
const PLACEHOLDER_CDN_HOST = "images.sectoria.pk";

function isBlockedHeroHost(hostname: string): boolean {
  if (hostname === PLACEHOLDER_CDN_HOST) return true;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  return false;
}

export function isLoadableSocietyHeroUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (isBlockedHeroHost(parsed.hostname)) return false;
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Best cover URL for directory cards: column first, then HERO media storage key. */
export function pickSocietyCardHeroUrl(
  heroImageUrl: string | null | undefined,
  heroStorageKey: string | null | undefined,
  storage: StorageAdapter,
): string | null {
  const candidates = [
    heroImageUrl,
    heroStorageKey ? storage.getPublicUrl(heroStorageKey) : null,
  ];
  for (const url of candidates) {
    if (url && isLoadableSocietyHeroUrl(url)) return url;
  }
  return null;
}
