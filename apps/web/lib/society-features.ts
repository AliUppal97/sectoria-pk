import type { AmenityFeature, SocietyHighlight } from "@sectoria/types";
import { isResolvableImageUrl } from "@/lib/society-media";

/** Public amenity row from `societyFeature.listAmenitiesForSociety`. */
export type AmenityFeaturePublic = AmenityFeature;

/** Public highlight row from `societyFeature.listHighlightsForSociety`. */
export type SocietyHighlightPublic = SocietyHighlight;

/** Build a CDN URL for an amenity image key (mirrors storage `getPublicUrl`). */
export function resolveAmenityImageUrl(
  imageKey: string | null | undefined,
): string | null {
  if (!imageKey?.trim()) return null;
  const base = process.env.STORAGE_PUBLIC_BASE_URL?.trim();
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}/${imageKey.replace(/^\//, "")}`;
  return isResolvableImageUrl(url) ? url : null;
}
