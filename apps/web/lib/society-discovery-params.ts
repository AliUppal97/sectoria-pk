import {
  PlotType,
  SocietyBookingStatus,
  VerificationTier,
  type PlotType as PlotTypeValue,
  type SocietyBookingStatus as SocietyBookingStatusValue,
  type SocietyListSort,
  type VerificationTier as VerificationTierValue,
} from "@sectoria/types";

/**
 * Canonical URL filter state for society discovery (homepage submit →
 * `/societies` directory). Param names match `societyListSummariesInputSchema`
 * — never invent a parallel `q` (foundations §3.2, ADR-010).
 *
 * Invalid values are ignored (never throw). If both price bounds are set and
 * `priceMinPkr > priceMaxPkr`, the pair is dropped so SSR never 500s.
 */
export interface SocietyDiscoveryParams {
  readonly search?: string;
  readonly citySlug?: string;
  readonly authority?: string;
  readonly verificationTier?: VerificationTierValue;
  readonly plotType?: PlotTypeValue;
  readonly sizeLabel?: string;
  readonly priceMinPkr?: number;
  readonly priceMaxPkr?: number;
  readonly developmentStage?: string;
  readonly bookingStatus?: SocietyBookingStatusValue;
  readonly sort?: SocietyListSort;
}

/** Mirrors the API enum; public UI only offers VERIFIED + HSMS_LINKED. */
const VALID_VERIFICATION_TIERS: ReadonlySet<string> = new Set(
  Object.values(VerificationTier),
);

const VALID_PLOT_TYPES: ReadonlySet<string> = new Set(Object.values(PlotType));

const VALID_BOOKING_STATUSES: ReadonlySet<string> = new Set(
  Object.values(SocietyBookingStatus),
);

const VALID_SORTS: ReadonlySet<string> = new Set([
  "name",
  "priceAsc",
  "priceDesc",
]);

/** Matches `societyListSummariesInputSchema.search` max length. */
const SEARCH_MAX_LENGTH = 120;
const SIZE_LABEL_MAX_LENGTH = 40;
const DEVELOPMENT_STAGE_MAX_LENGTH = 80;
const PRICE_FILTER_MAX_PKR = 1_000_000_000_000;

type SearchParamsRecord = Record<string, string | string[] | undefined>;

/** Reads a single-valued search param, ignoring repeated/array values. */
function readParam(
  params: SearchParamsRecord,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Parses a non-negative integer PKR bound; ignores non-numeric / out-of-range. */
function parsePricePkr(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  if (!/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) return undefined;
  if (value < 0 || value > PRICE_FILTER_MAX_PKR) return undefined;
  return value;
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

  const plotTypeRaw = readParam(params, "plotType");
  const plotType =
    plotTypeRaw && VALID_PLOT_TYPES.has(plotTypeRaw)
      ? (plotTypeRaw as PlotTypeValue)
      : undefined;

  const sizeLabelRaw = readParam(params, "sizeLabel")?.trim();
  const sizeLabel =
    sizeLabelRaw && sizeLabelRaw.length > 0
      ? sizeLabelRaw.slice(0, SIZE_LABEL_MAX_LENGTH)
      : undefined;

  let priceMinPkr = parsePricePkr(readParam(params, "priceMinPkr"));
  let priceMaxPkr = parsePricePkr(readParam(params, "priceMaxPkr"));
  if (
    priceMinPkr !== undefined &&
    priceMaxPkr !== undefined &&
    priceMinPkr > priceMaxPkr
  ) {
    priceMinPkr = undefined;
    priceMaxPkr = undefined;
  }

  const stageRaw = readParam(params, "developmentStage")?.trim();
  const developmentStage =
    stageRaw && stageRaw.length > 0
      ? stageRaw.slice(0, DEVELOPMENT_STAGE_MAX_LENGTH)
      : undefined;

  const bookingRaw = readParam(params, "bookingStatus");
  const bookingStatus =
    bookingRaw && VALID_BOOKING_STATUSES.has(bookingRaw)
      ? (bookingRaw as SocietyBookingStatusValue)
      : undefined;

  const sortRaw = readParam(params, "sort");
  const sort =
    sortRaw && VALID_SORTS.has(sortRaw)
      ? (sortRaw as SocietyListSort)
      : undefined;

  return {
    search,
    citySlug,
    authority,
    verificationTier,
    plotType,
    sizeLabel,
    priceMinPkr,
    priceMaxPkr,
    developmentStage,
    bookingStatus,
    sort,
  };
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
  if (filters.plotType) params.set("plotType", filters.plotType);
  if (filters.sizeLabel) params.set("sizeLabel", filters.sizeLabel);
  if (filters.priceMinPkr !== undefined) {
    params.set("priceMinPkr", String(filters.priceMinPkr));
  }
  if (filters.priceMaxPkr !== undefined) {
    params.set("priceMaxPkr", String(filters.priceMaxPkr));
  }
  if (filters.developmentStage) {
    params.set("developmentStage", filters.developmentStage);
  }
  if (filters.bookingStatus) {
    params.set("bookingStatus", filters.bookingStatus);
  }
  if (filters.sort && filters.sort !== "name") {
    params.set("sort", filters.sort);
  }
  return params;
}
