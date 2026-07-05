import { isResolvableImageUrl } from "@/lib/society-media";

/** Developer summary embedded on a society profile (`society.getBySlug`). */
export interface DeveloperSummary {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly logoKey?: string | null;
  readonly foundedYear?: number | null;
  readonly websiteUrl?: string | null;
}

/** Public project row from `developer.getBySlug`. */
export interface DeveloperProjectPublic {
  readonly id: string;
  readonly developerId: string;
  readonly name: string;
  readonly description?: string | null;
  readonly imageKey?: string | null;
  readonly year?: number | null;
  readonly city?: string | null;
  readonly sortOrder: number;
}

/** Published society row linked to a developer profile. */
export interface DeveloperSocietyPublic {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly city: string;
  readonly citySlug: string;
  readonly verificationTier: string;
}

/** Build a CDN URL for a developer logo or project image key. */
export function resolveDeveloperAssetUrl(
  assetKey: string | null | undefined,
): string | null {
  if (!assetKey?.trim()) return null;
  const base = process.env.STORAGE_PUBLIC_BASE_URL?.trim();
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}/${assetKey.replace(/^\//, "")}`;
  return isResolvableImageUrl(url) ? url : null;
}

/** Short bio for cards — full description when brief, otherwise trimmed. */
export function developerShortBio(description: string, maxLength = 220): string {
  const trimmed = description.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const slice = trimmed.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut}…`;
}
