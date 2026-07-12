import "server-only";
import { cache } from "react";
import type {
  PlotType,
  SocietyBookingStatus,
  SocietyListSort,
  VerificationTier,
} from "@sectoria/types";
import { getApi } from "./trpc/server";
import { isNotFound } from "./fetch";
import {
  startingPrice,
  type PricedCategory,
  type SocietySummary,
} from "./marketplace";

/**
 * Composed read helpers for the marketplace pages.
 *
 * SCALE (M0.7 + H1): the directory list, facets, and search are served by the
 * cursor-paginated `society.listSummaries` / `society.facets` procedures, which
 * run a *bounded* number of queries (aggregates via `groupBy`, search via the
 * pg_trgm trigram index) rather than the old N+1 fan-out + three full-table
 * facet scans (`scalability-and-performance.mdc`, `m0-onboarding-and-scale.md`).
 * Every read is PUBLISHED-only — drafts/archived never surface publicly.
 */

/** The number of societies the directory shows on its first (SSR) page. */
const DIRECTORY_PAGE_SIZE = 48;

/** Filters accepted by the society directory, mirroring listSummaries input. */
export interface SocietyFilters {
  readonly citySlug?: string;
  readonly verificationTier?: VerificationTier;
  readonly authority?: string;
  readonly search?: string;
  readonly plotType?: PlotType;
  readonly sizeLabel?: string;
  readonly priceMinPkr?: number;
  readonly priceMaxPkr?: number;
  readonly developmentStage?: string;
  readonly bookingStatus?: SocietyBookingStatus;
  readonly sort?: SocietyListSort;
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
    heroImageUrl?: string | null;
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
    heroImageUrl: society.heroImageUrl ?? null,
  };
}

/**
 * Lists societies matching the filters, each enriched into a `SocietySummary`.
 * Served by the bounded, cursor-paginated `society.listSummaries` procedure —
 * the first page (SSR) is returned here; deeper pages are reachable via the
 * procedure's cursor.
 */
export async function listSocietySummaries(
  filters?: SocietyFilters,
): Promise<SocietySummary[]> {
  const api = getApi();
  const { items } = await api.society.listSummaries({
    limit: DIRECTORY_PAGE_SIZE,
    citySlug: filters?.citySlug,
    authority: filters?.authority,
    verificationTier: filters?.verificationTier,
    search: filters?.search,
    plotType: filters?.plotType,
    sizeLabel: filters?.sizeLabel,
    priceMinPkr: filters?.priceMinPkr,
    priceMaxPkr: filters?.priceMaxPkr,
    developmentStage: filters?.developmentStage,
    bookingStatus: filters?.bookingStatus,
    sort: filters?.sort,
  });
  return items;
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

/**
 * Facet counts (city/authority/tier) for PUBLISHED societies, derived from a
 * single `groupBy` in `society.facets`. `cache`d per request so the directory
 * page's city and authority filters share one round-trip.
 */
const getFacets = cache(async () => getApi().society.facets());

/** Distinct city facets (slug + label + count) for directory / homepage chips. */
export async function listCityFacets(): Promise<
  { slug: string; label: string; count: number }[]
> {
  const { cities } = await getFacets();
  return cities
    .map(({ slug, label, count }) => ({ slug, label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Distinct authority facets (e.g. LDA, CDA) for the directory filter. */
export async function listAuthorityFacets(): Promise<string[]> {
  const { authorities } = await getFacets();
  return authorities.map((facet) => facet.value).sort();
}
