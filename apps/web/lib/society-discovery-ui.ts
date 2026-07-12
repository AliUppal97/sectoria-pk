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

/** Stable id for an applied-filter chip (one chip per filter dimension). */
export type AppliedDiscoveryChipId =
  | "search"
  | "citySlug"
  | "budget"
  | "plotType"
  | "verificationTier"
  | "authority"
  | "sizeLabel"
  | "developmentStage"
  | "bookingStatus"
  | "sort";

/**
 * A dismissible applied-filter chip. `clear` is a partial params patch that
 * removes this dimension (callers merge into URL / home draft). Pure — no I/O.
 */
export interface AppliedDiscoveryChip {
  readonly id: AppliedDiscoveryChipId;
  /** Dimension label shown muted before the value (e.g. "City"). */
  readonly category: string;
  /** Short human label for the active value. */
  readonly label: string;
  /** Accessible name: "Remove city filter: Lahore". */
  readonly ariaLabel: string;
  readonly clear: Partial<SocietyDiscoveryParams>;
  /** When true, the search input must be cleared alongside `clear`. */
  readonly clearsSearchInput?: boolean;
}

/** Budget chip label for non-preset bounds (avoids importing UI formatters). */
function formatBudgetChipLabel(
  priceMinPkr: number | undefined,
  priceMaxPkr: number | undefined,
): string {
  const presetId = matchBudgetPresetId(priceMinPkr, priceMaxPkr);
  if (presetId !== undefined) {
    return (
      BUDGET_PRESETS.find((preset) => preset.id === presetId)?.label ??
      "Budget"
    );
  }
  if (priceMinPkr !== undefined && priceMaxPkr !== undefined) {
    return `PKR ${priceMinPkr.toLocaleString("en-PK")} – ${priceMaxPkr.toLocaleString("en-PK")}`;
  }
  if (priceMaxPkr !== undefined) {
    return `Up to PKR ${priceMaxPkr.toLocaleString("en-PK")}`;
  }
  if (priceMinPkr !== undefined) {
    return `From PKR ${priceMinPkr.toLocaleString("en-PK")}`;
  }
  return "Budget";
}

/**
 * Builds applied-filter chips for the DiscoveryBar row. Includes every active
 * dimension (search, city, budget, plot type, sheet filters) so the user can
 * scan and dismiss filters in one place. Uses facets for city display labels
 * (in-memory). `pendingSearch` covers debounce lag / home draft text.
 *
 * `mode` is accepted for call-site stability; chip emission is mode-agnostic.
 */
export function buildAppliedDiscoveryChips(
  filters: SocietyDiscoveryParams,
  facets: SocietyDiscoveryFacets,
  pendingSearch = "",
  mode: DiscoveryBarMode = "home",
): AppliedDiscoveryChip[] {
  void mode;

  const chips: AppliedDiscoveryChip[] = [];

  const searchText = pendingSearch.trim() || filters.search?.trim() || "";
  if (searchText.length > 0) {
    chips.push({
      id: "search",
      category: "Search",
      label: searchText,
      ariaLabel: `Remove search filter: ${searchText}`,
      clear: { search: undefined },
      clearsSearchInput: true,
    });
  }

  if (filters.citySlug) {
    const cityLabel =
      facets.cities.find((city) => city.slug === filters.citySlug)?.label ??
      filters.citySlug;
    chips.push({
      id: "citySlug",
      category: "City",
      label: cityLabel,
      ariaLabel: `Remove city filter: ${cityLabel}`,
      clear: { citySlug: undefined },
    });
  }

  if (
    filters.priceMinPkr !== undefined ||
    filters.priceMaxPkr !== undefined
  ) {
    const label = formatBudgetChipLabel(
      filters.priceMinPkr,
      filters.priceMaxPkr,
    );
    chips.push({
      id: "budget",
      category: "Budget",
      label,
      ariaLabel: `Remove budget filter: ${label}`,
      clear: { priceMinPkr: undefined, priceMaxPkr: undefined },
    });
  }

  if (filters.plotType) {
    const label =
      PLOT_TYPE_OPTIONS.find((option) => option.value === filters.plotType)
        ?.label ?? filters.plotType;
    chips.push({
      id: "plotType",
      category: "Type",
      label,
      ariaLabel: `Remove plot type filter: ${label}`,
      clear: { plotType: undefined },
    });
  }

  if (filters.verificationTier) {
    const label =
      PUBLIC_VERIFICATION_OPTIONS.find(
        (option) => option.value === filters.verificationTier,
      )?.label ?? filters.verificationTier;
    chips.push({
      id: "verificationTier",
      category: "Verification",
      label,
      ariaLabel: `Remove verification filter: ${label}`,
      clear: { verificationTier: undefined },
    });
  }

  if (filters.authority) {
    chips.push({
      id: "authority",
      category: "Authority",
      label: filters.authority,
      ariaLabel: `Remove authority filter: ${filters.authority}`,
      clear: { authority: undefined },
    });
  }

  if (filters.sizeLabel) {
    chips.push({
      id: "sizeLabel",
      category: "Size",
      label: filters.sizeLabel,
      ariaLabel: `Remove plot size filter: ${filters.sizeLabel}`,
      clear: { sizeLabel: undefined },
    });
  }

  if (filters.developmentStage) {
    chips.push({
      id: "developmentStage",
      category: "Stage",
      label: filters.developmentStage,
      ariaLabel: `Remove development stage filter: ${filters.developmentStage}`,
      clear: { developmentStage: undefined },
    });
  }

  if (filters.bookingStatus) {
    const label =
      BOOKING_STATUS_OPTIONS.find(
        (option) => option.value === filters.bookingStatus,
      )?.label ?? filters.bookingStatus;
    chips.push({
      id: "bookingStatus",
      category: "Booking",
      label,
      ariaLabel: `Remove booking status filter: ${label}`,
      clear: { bookingStatus: undefined },
    });
  }

  if (filters.sort && filters.sort !== "name") {
    const label =
      SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ??
      filters.sort;
    chips.push({
      id: "sort",
      category: "Sort",
      label,
      ariaLabel: `Remove sort: ${label}`,
      clear: { sort: undefined },
    });
  }

  return chips;
}
