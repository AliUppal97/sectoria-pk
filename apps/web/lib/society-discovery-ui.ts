import {
  COMMON_PLOT_SIZE_LABELS,
  DEVELOPMENT_STAGES,
  PlotType,
  SocietyBookingStatus,
  type PlotType as PlotTypeValue,
  type SocietyBookingStatus as SocietyBookingStatusValue,
} from "@sectoria/types";
import type { SocietyDiscoveryParams } from "./society-discovery-params";

/**
 * Pure helpers + catalogs for `SocietyDiscoveryBar` (discovery-search §2,
 * foundations §4). Kept free of React so Vitest can cover budget presets and
 * public verification options without a component harness.
 */

/** Sentinel for "any / all" in selects — maps to removing the URL param. */
export const DISCOVERY_ALL = "all";

/** Directory search debounce — locked ≥300ms (discovery-search §2.1). */
export const SEARCH_DEBOUNCE_MS = 300;

/** Public verification labels — never include PENDING (foundations §2). */
export const PUBLIC_VERIFICATION_OPTIONS = [
  { value: "VERIFIED", label: "LOP + NOC verified" },
  { value: "HSMS_LINKED", label: "HSMS live-linked" },
] as const;

export const PLOT_TYPE_OPTIONS = [
  { value: PlotType.RESIDENTIAL, label: "Residential" },
  { value: PlotType.COMMERCIAL, label: "Commercial" },
] as const;

export const BOOKING_STATUS_OPTIONS = [
  { value: SocietyBookingStatus.OPEN, label: "Open" },
  { value: SocietyBookingStatus.UPCOMING, label: "Upcoming" },
  { value: SocietyBookingStatus.CLOSED, label: "Closed" },
] as const;

export const SORT_OPTIONS = [
  { value: "name", label: "Name (A–Z)" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
] as const;

/** Budget preset bands → URL `priceMinPkr` / `priceMaxPkr` (discovery-search §2.3). */
export interface BudgetPreset {
  readonly id: string;
  readonly label: string;
  readonly priceMinPkr?: number;
  readonly priceMaxPkr?: number;
}

export const BUDGET_PRESETS: readonly BudgetPreset[] = [
  {
    id: "under-50-lakh",
    label: "Under 50 lakh",
    priceMaxPkr: 5_000_000,
  },
  {
    id: "50l-1cr",
    label: "50 lakh – 1 crore",
    priceMinPkr: 5_000_000,
    priceMaxPkr: 10_000_000,
  },
  {
    id: "1-2cr",
    label: "1 – 2 crore",
    priceMinPkr: 10_000_000,
    priceMaxPkr: 20_000_000,
  },
  {
    id: "2-5cr",
    label: "2 – 5 crore",
    priceMinPkr: 20_000_000,
    priceMaxPkr: 50_000_000,
  },
  {
    id: "5cr-plus",
    label: "5 crore+",
    priceMinPkr: 50_000_000,
  },
] as const;

/** Facet payload shape from `society.facets` (H1 enrichment). */
export interface SocietyDiscoveryFacets {
  readonly cities: readonly { slug: string; label: string; count: number }[];
  readonly authorities: readonly { value: string; count: number }[];
  readonly tiers: readonly { tier: string; count: number }[];
  readonly plotTypes: readonly { value: string; count: number }[];
  readonly sizeLabels: readonly { value: string; count: number }[];
  readonly developmentStages: readonly { value: string; count: number }[];
  readonly bookingStatuses: readonly { value: string; count: number }[];
}

export const EMPTY_DISCOVERY_FACETS: SocietyDiscoveryFacets = {
  cities: [],
  authorities: [],
  tiers: [],
  plotTypes: [],
  sizeLabels: [],
  developmentStages: [],
  bookingStatuses: [],
};

/** Resolves which budget preset matches current price bounds (exact match). */
export function matchBudgetPresetId(
  priceMinPkr: number | undefined,
  priceMaxPkr: number | undefined,
): string | undefined {
  if (priceMinPkr === undefined && priceMaxPkr === undefined) return undefined;
  return BUDGET_PRESETS.find(
    (preset) =>
      preset.priceMinPkr === priceMinPkr &&
      preset.priceMaxPkr === priceMaxPkr,
  )?.id;
}

/** Looks up a budget preset by id and returns price bounds for the URL. */
export function budgetPresetToPriceBounds(presetId: string): {
  priceMinPkr?: number;
  priceMaxPkr?: number;
} {
  const preset = BUDGET_PRESETS.find((entry) => entry.id === presetId);
  if (!preset) return {};
  return {
    priceMinPkr: preset.priceMinPkr,
    priceMaxPkr: preset.priceMaxPkr,
  };
}

/**
 * Fields that live behind the Filters sheet for a given mode
 * (foundations §4 Tier A/B lock).
 */
export type DiscoveryBarMode = "home" | "directory";

/** Counts active filters that sit behind the Filters control for `mode`. */
export function countFiltersBehindSheet(
  filters: SocietyDiscoveryParams,
  mode: DiscoveryBarMode,
): number {
  let count = 0;
  if (mode === "home") {
    if (filters.priceMinPkr !== undefined || filters.priceMaxPkr !== undefined) {
      count += 1;
    }
    if (filters.plotType) count += 1;
  }
  if (filters.verificationTier) count += 1;
  if (filters.authority) count += 1;
  if (filters.sizeLabel) count += 1;
  if (filters.developmentStage) count += 1;
  if (filters.bookingStatus) count += 1;
  if (filters.sort && filters.sort !== "name") count += 1;
  return count;
}

/** True when any discovery param (or pending search text) is active. */
export function hasAnyDiscoveryFilter(
  filters: SocietyDiscoveryParams,
  pendingSearch = "",
): boolean {
  return (
    Boolean(filters.search) ||
    Boolean(filters.citySlug) ||
    Boolean(filters.verificationTier) ||
    Boolean(filters.authority) ||
    Boolean(filters.plotType) ||
    Boolean(filters.sizeLabel) ||
    filters.priceMinPkr !== undefined ||
    filters.priceMaxPkr !== undefined ||
    Boolean(filters.developmentStage) ||
    Boolean(filters.bookingStatus) ||
    Boolean(filters.sort && filters.sort !== "name") ||
    pendingSearch.trim().length > 0
  );
}

/**
 * Unions a curated catalog with live facet values (catalog first, then
 * extras from facets not already listed).
 */
export function unionLabeledOptions(
  catalog: readonly { value: string; label: string }[],
  facetValues: readonly string[],
): { value: string; label: string }[] {
  const seen = new Set(catalog.map((entry) => entry.value));
  const extras = facetValues
    .filter((value) => value.length > 0 && !seen.has(value))
    .map((value) => ({ value, label: value }));
  return [...catalog, ...extras];
}

export function sizeLabelOptions(
  facets: SocietyDiscoveryFacets,
): { value: string; label: string }[] {
  return unionLabeledOptions(
    COMMON_PLOT_SIZE_LABELS,
    facets.sizeLabels.map((f) => f.value),
  );
}

export function developmentStageOptions(
  facets: SocietyDiscoveryFacets,
): { value: string; label: string }[] {
  return unionLabeledOptions(
    DEVELOPMENT_STAGES,
    facets.developmentStages.map((f) => f.value),
  );
}

export function isPlotType(value: string): value is PlotTypeValue {
  return Object.values(PlotType).includes(value as PlotTypeValue);
}

export function isBookingStatus(
  value: string,
): value is SocietyBookingStatusValue {
  return Object.values(SocietyBookingStatus).includes(
    value as SocietyBookingStatusValue,
  );
}
