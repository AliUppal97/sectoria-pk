import { isResolvableImageUrl } from "@/lib/society-media";

/** Public article row from `article.list` / `article.getBySlug`. */
export interface ArticlePublic {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly body: string;
  readonly coverKey?: string | null;
  readonly authorName: string;
  readonly publishedAt?: string | null;
  readonly isPublished: boolean;
  readonly societyId?: string | null;
  readonly developerId?: string | null;
  readonly createdAt: string;
}

/** Build a CDN URL for an article cover image key. */
export function resolveArticleCoverUrl(
  coverKey: string | null | undefined,
): string | null {
  if (!coverKey?.trim()) return null;
  const base = process.env.STORAGE_PUBLIC_BASE_URL?.trim();
  if (!base) return null;
  const url = `${base.replace(/\/$/, "")}/${coverKey.replace(/^\//, "")}`;
  return isResolvableImageUrl(url) ? url : null;
}
