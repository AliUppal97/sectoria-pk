import {
  VerificationTier,
  type VerificationTier as VerificationTierValue,
} from "@sectoria/types";

/**
 * Canonical URL filter state for society discovery (homepage submit →
 * `/societies` directory). Param names match `societyListSummariesInputSchema`
 * — never invent a parallel `q` (foundations §3.2, ADR-010).
 *
 * H0 covers search / city / authority / tier. H1+ extends this shape in place
 * (price, plot type, size, stage, booking, sort) — keep parse/serialize the
 * single source of truth for those keys.
 */
export interface SocietyDiscoveryParams {
  readonly search?: string;
  readonly citySlug?: string;
  readonly authority?: string;
  readonly verificationTier?: VerificationTierValue;
}

/** Mirrors the API enum; public UI only offers VERIFIED + HSMS_LINKED. */
const VALID_VERIFICATION_TIERS: ReadonlySet<string> = new Set(
  Object.values(VerificationTier),
);

/** Matches `societyListSummariesInputSchema.search` max length. */
const SEARCH_MAX_LENGTH = 120;

type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** Reads a single-valued search param, ignoring repeated/array values. */
function readParam(
  params: SearchParamsRecord,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Parses Next.js `searchParams` into discovery filters. Invalid values are
 * ignored (never throw) so SSR never 500s on a bad bookmark.
 */
export function parseSocietyDiscoveryParams(
  params: SearchParamsRecord,
): SocietyDiscoveryParams {
  const searchRaw = readParam(params, "search")?.trim();
  const search =
    searchRaw && searchRaw.length > 0
      ? searchRaw.slice(0, SEARCH_MAX_LENGTH)
      : undefined;

  const citySlug = readParam(params, "citySlug");
  const authority = readParam(params, "authority");

  const tierRaw = readParam(params, "verificationTier");
  const verificationTier =
    tierRaw && VALID_VERIFICATION_TIERS.has(tierRaw)
      ? (tierRaw as VerificationTierValue)
      : undefined;

  return { search, citySlug, authority, verificationTier };
}

/**
 * Serializes discovery filters to `URLSearchParams` (omits undefined keys).
 * Shared by directory filters and (later) homepage DiscoveryBar submit.
 */
export function serializeSocietyDiscoveryParams(
  filters: SocietyDiscoveryParams,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.citySlug) params.set("citySlug", filters.citySlug);
  if (filters.authority) params.set("authority", filters.authority);
  if (filters.verificationTier) {
    params.set("verificationTier", filters.verificationTier);
  }
  return params;
}
