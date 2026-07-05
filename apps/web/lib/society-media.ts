import { SocietyMediaKind } from "@sectoria/types";

/** Public media row from `media.listForSociety` (storage key resolved to URL). */
export interface SocietyMediaPublic {
  readonly id: string;
  readonly societyId: string;
  readonly kind: (typeof SocietyMediaKind)[keyof typeof SocietyMediaKind];
  readonly url: string;
  readonly alt: string;
  readonly caption?: string | null;
  readonly capturedAt?: string | null;
  readonly sortOrder: number;
  readonly width?: number | null;
  readonly height?: number | null;
  readonly createdAt: string;
}

/** Seed CDN host — URLs here do not resolve in dev (see society-thumbnail.tsx). */
const PLACEHOLDER_CDN_HOST = "images.sectoria.pk";

const DEFAULT_HERO_WIDTH = 1920;
const DEFAULT_HERO_HEIGHT = 1080;

/** Tiny navy JPEG used as `next/image` blur placeholder (no network). */
export const SOCIETY_MEDIA_BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";

export function isResolvableImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === PLACEHOLDER_CDN_HOST) return false;
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export interface ResolvedHeroImage {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

/** Prefer `kind=HERO` media; fall back to a loadable `heroImageUrl`. */
export function pickHeroImage(
  media: readonly SocietyMediaPublic[],
  heroImageUrl?: string | null,
  societyName?: string,
): ResolvedHeroImage | null {
  const heroMedia = media
    .filter((item) => item.kind === SocietyMediaKind.HERO)
    .sort((a, b) => a.sortOrder - b.sortOrder)[0];

  if (heroMedia) {
    return {
      src: heroMedia.url,
      alt: heroMedia.alt,
      width: heroMedia.width ?? DEFAULT_HERO_WIDTH,
      height: heroMedia.height ?? DEFAULT_HERO_HEIGHT,
    };
  }

  if (heroImageUrl && isResolvableImageUrl(heroImageUrl)) {
    return {
      src: heroImageUrl,
      alt: societyName ? `${societyName} cover photo` : "Society cover photo",
      width: DEFAULT_HERO_WIDTH,
      height: DEFAULT_HERO_HEIGHT,
    };
  }

  return null;
}

export function filterMediaByKind(
  media: readonly SocietyMediaPublic[],
  kind: (typeof SocietyMediaKind)[keyof typeof SocietyMediaKind],
): SocietyMediaPublic[] {
  return media
    .filter((item) => item.kind === kind)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** PROGRESS items ordered by `capturedAt` descending (newest first). */
export function sortProgressNewestFirst(
  media: readonly SocietyMediaPublic[],
): SocietyMediaPublic[] {
  return [...media]
    .filter((item) => item.kind === SocietyMediaKind.PROGRESS)
    .sort((a, b) => {
      const aTime = a.capturedAt ? new Date(a.capturedAt).getTime() : 0;
      const bTime = b.capturedAt ? new Date(b.capturedAt).getTime() : 0;
      return bTime - aTime || a.sortOrder - b.sortOrder;
    });
}

/** Month/year label for progress photos — e.g. "MAR 2024". */
export function formatProgressDateLabel(capturedAt: string): string {
  const date = new Date(capturedAt);
  const month = date
    .toLocaleString("en-GB", { month: "short", timeZone: "UTC" })
    .toUpperCase();
  return `${month} ${date.getUTCFullYear()}`;
}
