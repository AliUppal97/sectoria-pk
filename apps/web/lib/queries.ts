import "server-only";
import type { SocietyBookingStatus, VerificationTier } from "@sectoria/types";
import { getApi } from "./trpc/server";
import { isNotFound } from "./fetch";
import {
  startingPrice,
  type PricedCategory,
  type SocietySummary,
} from "./marketplace";

/**
 * Composed read helpers for the marketplace pages. Each enriches the base
 * society record with its category count, starting price, and aggregate rating
 * — values the directory/comparison views need but that the single-purpose
 * routers don't bundle together.
 *
 * SCALE NOTE: this fans out one categories + reviews query per society, which is
 * fine at the current scale (a handful of societies). When the directory grows
 * past a page of results, replace this with a dedicated aggregate procedure /
 * paginated query in `@sectoria/api-client` rather than widening the fan-out
 * (scalability-and-performance.mdc).
 */

/** Filters accepted by the society directory, mirroring `society.list` input. */
export interface SocietyFilters {
  readonly citySlug?: string;
  readonly verificationTier?: VerificationTier;
  readonly authority?: string;
}

/** The reviewable shape used to derive an aggregate rating. */
interface RatingRow {
  readonly rating: number;
}

function averageRating(
  reviews: readonly RatingRow[],
): SocietySummary["rating"] {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  return { value: sum / reviews.length, count: reviews.length };
}

/** Maps a society row + its categories/reviews into a serializable summary. */
function summarizeSociety(
  society: {
    id: string;
    slug: string;
    name: string;
    city: string;
    citySlug: string;
    authority: string;
    verificationTier: VerificationTier;
    hsmsLinked: boolean;
    developmentStage: string;
    developmentPct: number;
    latitude?: number | null;
    longitude?: number | null;
    totalLandKanal?: string | null;
    developedLandKanal?: string | null;
    bookingStatus?: SocietyBookingStatus;
  },
  categories: readonly PricedCategory[],
  reviews: readonly RatingRow[],
  latestUpdateTitle?: string | null,
): SocietySummary {
  return {
    id: society.id,
    slug: society.slug,
    name: society.name,
    city: society.city,
    citySlug: society.citySlug,
    authority: society.authority,
    verificationTier: society.verificationTier,
    hsmsLinked: society.hsmsLinked,
    developmentStage: society.developmentStage,
    developmentPct: society.developmentPct,
    categoryCount: categories.length,
    startingPrice: startingPrice(categories),
    rating: averageRating(reviews),
    latitude: society.latitude ?? null,
    longitude: society.longitude ?? null,
    totalLandKanal: society.totalLandKanal ?? null,
    developedLandKanal: society.developedLandKanal ?? null,
    bookingStatus: society.bookingStatus ?? "OPEN",
    latestUpdateTitle: latestUpdateTitle ?? null,
  };
}

/** Lists societies matching the filters, each enriched into a `SocietySummary`. */
export async function listSocietySummaries(
  filters?: SocietyFilters,
): Promise<SocietySummary[]> {
  const api = getApi();
  const societies = await api.society.list(filters);
  return Promise.all(
    societies.map(async (society) => {
      const [categories, reviews] = await Promise.all([
        api.inventoryCategory.listBySociety({ societyId: society.id }),
        api.review.listForSociety({ societyId: society.id }),
      ]);
      return summarizeSociety(society, categories, reviews);
    }),
  );
}

/**
 * Enriched summary for a single society by slug, or null if it doesn't exist.
 * Used by the comparison tool, which addresses societies by their public slug.
 */
export async function getSocietySummaryBySlug(
  slug: string,
): Promise<SocietySummary | null> {
  const api = getApi();
  try {
    const society = await api.society.getBySlug({ slug });
    const reviews = await api.review.listForSociety({ societyId: society.id });
    return summarizeSociety(
      society,
      society.categories,
      reviews,
      society.updates[0]?.title ?? null,
    );
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

/** Lightweight {slug, name} options for pickers (e.g. the compare selector). */
export async function listSocietyOptions(): Promise<
  { slug: string; name: string }[]
> {
  const api = getApi();
  const societies = await api.society.list();
  return societies
    .map((society) => ({ slug: society.slug, name: society.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Distinct city facets (slug + display label) for the directory filter. */
export async function listCityFacets(): Promise<
  { slug: string; label: string }[]
> {
  const api = getApi();
  const societies = await api.society.list();
  const byCitySlug = new Map<string, string>();
  for (const society of societies) {
    byCitySlug.set(society.citySlug, society.city);
  }
  return [...byCitySlug.entries()]
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Distinct authority facets (e.g. LDA, CDA) for the directory filter. */
export async function listAuthorityFacets(): Promise<string[]> {
  const api = getApi();
  const societies = await api.society.list();
  return [...new Set(societies.map((society) => society.authority))].sort();
}
