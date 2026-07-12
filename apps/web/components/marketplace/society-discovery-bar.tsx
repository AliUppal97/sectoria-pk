"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, RotateCcw, Search } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  useDebouncedValue,
} from "@sectoria/ui";
import type { SocietyListSort } from "@sectoria/types";
import {
  parseSocietyDiscoveryParams,
  serializeSocietyDiscoveryParams,
  type SocietyDiscoveryParams,
} from "@/lib/society-discovery-params";
import {
  BOOKING_STATUS_OPTIONS,
  BUDGET_PRESETS,
  DISCOVERY_ALL,
  EMPTY_DISCOVERY_FACETS,
  PLOT_TYPE_OPTIONS,
  PUBLIC_VERIFICATION_OPTIONS,
  SEARCH_DEBOUNCE_MS,
  SORT_OPTIONS,
  budgetPresetToPriceBounds,
  countFiltersBehindSheet,
  developmentStageOptions,
  hasAnyDiscoveryFilter,
  isBookingStatus,
  isPlotType,
  matchBudgetPresetId,
  sizeLabelOptions,
  type DiscoveryBarMode,
  type SocietyDiscoveryFacets,
} from "@/lib/society-discovery-ui";

/**
 * Shared society discovery bar for homepage (`mode=home`) and `/societies`
 * (`mode=directory`). URL is the source of truth on the directory; home
 * composes locally until Search (foundations §3, discovery-search §2.1).
 *
 * Public verification options exclude PENDING. Tokens only; 44px targets;
 * no Book Now (concierge-model.mdc).
 */

const nativeSelectClassName =
  "flex h-11 min-h-[44px] w-full cursor-pointer touch-manipulation items-center rounded-md border border-border-base bg-surface-card px-3 font-sans text-sm text-text-primary md:hidden";

export interface SocietyDiscoveryBarProps {
  readonly facets: SocietyDiscoveryFacets;
  /** When true, filters stay usable with empty option lists + an error note. */
  readonly facetsError?: boolean;
  readonly mode: DiscoveryBarMode;
  readonly current: SocietyDiscoveryParams;
}

interface DualSelectProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly allLabel: string;
  readonly options: readonly { value: string; label: string }[];
  readonly ariaLabel: string;
}

function DualSelect({
  id,
  label,
  value,
  onChange,
  allLabel,
  options,
  ariaLabel,
}: DualSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className={nativeSelectClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
      >
        <option value={DISCOVERY_ALL}>{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="hidden md:flex" aria-label={ariaLabel}>
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DISCOVERY_ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SheetFields({
  idPrefix,
  draft,
  onPatch,
  facets,
  includeBudgetAndPlotType,
}: {
  readonly idPrefix: string;
  readonly draft: SocietyDiscoveryParams;
  readonly onPatch: (patch: Partial<SocietyDiscoveryParams>) => void;
  readonly facets: SocietyDiscoveryFacets;
  readonly includeBudgetAndPlotType: boolean;
}) {
  const budgetValue = matchBudgetPresetId(draft.priceMinPkr, draft.priceMaxPkr);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {includeBudgetAndPlotType ? (
        <>
          <DualSelect
            id={`${idPrefix}-budget`}
            label="Budget"
            value={budgetValue ?? DISCOVERY_ALL}
            allLabel="Any budget"
            ariaLabel="Filter by budget"
            options={BUDGET_PRESETS.map((preset) => ({
              value: preset.id,
              label: preset.label,
            }))}
            onChange={(value) => {
              if (value === DISCOVERY_ALL) {
                onPatch({
                  priceMinPkr: undefined,
                  priceMaxPkr: undefined,
                });
                return;
              }
              onPatch(budgetPresetToPriceBounds(value));
            }}
          />
          <DualSelect
            id={`${idPrefix}-plot-type`}
            label="Plot type"
            value={draft.plotType ?? DISCOVERY_ALL}
            allLabel="Any type"
            ariaLabel="Filter by plot type"
            options={PLOT_TYPE_OPTIONS}
            onChange={(value) =>
              onPatch({
                plotType:
                  value === DISCOVERY_ALL || !isPlotType(value)
                    ? undefined
                    : value,
              })
            }
          />
        </>
      ) : null}

      <DualSelect
        id={`${idPrefix}-tier`}
        label="Verification"
        value={draft.verificationTier ?? DISCOVERY_ALL}
        allLabel="Any verification"
        ariaLabel="Filter by verification tier"
        options={PUBLIC_VERIFICATION_OPTIONS}
        onChange={(value) =>
          onPatch({
            verificationTier:
              value === DISCOVERY_ALL
                ? undefined
                : (value as SocietyDiscoveryParams["verificationTier"]),
          })
        }
      />
      <DualSelect
        id={`${idPrefix}-authority`}
        label="Authority"
        value={draft.authority ?? DISCOVERY_ALL}
        allLabel="All authorities"
        ariaLabel="Filter by development authority"
        options={facets.authorities.map((facet) => ({
          value: facet.value,
          label: facet.value,
        }))}
        onChange={(value) =>
          onPatch({
            authority: value === DISCOVERY_ALL ? undefined : value,
          })
        }
      />
      <DualSelect
        id={`${idPrefix}-size`}
        label="Plot size"
        value={draft.sizeLabel ?? DISCOVERY_ALL}
        allLabel="Any size"
        ariaLabel="Filter by plot size"
        options={sizeLabelOptions(facets)}
        onChange={(value) =>
          onPatch({
            sizeLabel: value === DISCOVERY_ALL ? undefined : value,
          })
        }
      />
      <DualSelect
        id={`${idPrefix}-stage`}
        label="Development stage"
        value={draft.developmentStage ?? DISCOVERY_ALL}
        allLabel="Any stage"
        ariaLabel="Filter by development stage"
        options={developmentStageOptions(facets)}
        onChange={(value) =>
          onPatch({
            developmentStage: value === DISCOVERY_ALL ? undefined : value,
          })
        }
      />
      <DualSelect
        id={`${idPrefix}-booking`}
        label="Booking status"
        value={draft.bookingStatus ?? DISCOVERY_ALL}
        allLabel="Any booking status"
        ariaLabel="Filter by booking status"
        options={BOOKING_STATUS_OPTIONS}
        onChange={(value) =>
          onPatch({
            bookingStatus:
              value === DISCOVERY_ALL || !isBookingStatus(value)
                ? undefined
                : value,
          })
        }
      />
      <DualSelect
        id={`${idPrefix}-sort`}
        label="Sort"
        value={
          draft.sort && draft.sort !== "name" ? draft.sort : DISCOVERY_ALL
        }
        allLabel="Name (A–Z)"
        ariaLabel="Sort societies"
        options={SORT_OPTIONS.filter((option) => option.value !== "name")}
        onChange={(value) =>
          onPatch({
            sort:
              value === DISCOVERY_ALL
                ? undefined
                : (value as SocietyListSort),
          })
        }
      />
    </div>
  );
}

export function SocietyDiscoveryBar({
  facets: facetsProp,
  facetsError = false,
  mode,
  current,
}: SocietyDiscoveryBarProps) {
  const facets = facetsProp ?? EMPTY_DISCOVERY_FACETS;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const baseId = useId();

  // Home: compose locally until Search. Directory: URL drives `current`.
  const [homeDraft, setHomeDraft] = useState<SocietyDiscoveryParams>(current);
  const [searchInput, setSearchInput] = useState(current.search ?? "");
  const [prevUrlSearch, setPrevUrlSearch] = useState(current.search ?? "");
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  // Sheet draft — Tier B (and home budget/type) before Apply.
  const [sheetDraft, setSheetDraft] = useState<SocietyDiscoveryParams>(current);

  const activeFilters = mode === "home" ? homeDraft : current;

  // External URL change (Reset / back) — resync search input during render
  // (react.dev: adjust state when props change; avoid setState-in-effect).
  if (mode === "directory") {
    const urlSearch = current.search ?? "";
    if (urlSearch !== prevUrlSearch) {
      setPrevUrlSearch(urlSearch);
      setSearchInput(urlSearch);
    }
  }

  /** Reads the live URL so directory patches never clobber a concurrent edit. */
  const filtersFromUrl = useCallback((): SocietyDiscoveryParams => {
    const record: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      record[key] = value;
    });
    return parseSocietyDiscoveryParams(record);
  }, [searchParams]);

  const replaceParams = useCallback(
    (next: SocietyDiscoveryParams) => {
      const params = serializeSocietyDiscoveryParams(next);
      startTransition(() => {
        router.replace(
          params.size > 0 ? `${pathname}?${params}` : pathname,
          { scroll: false },
        );
      });
    },
    [pathname, router],
  );

  // Directory: debounced search → router.replace.
  useEffect(() => {
    if (mode !== "directory") return;
    const next = debouncedSearch.trim();
    const existing = searchParams.get("search") ?? "";
    if (next === existing) return;

    replaceParams({
      ...filtersFromUrl(),
      search: next.length > 0 ? next : undefined,
    });
  }, [mode, debouncedSearch, searchParams, filtersFromUrl, replaceParams]);

  const patchDirectory = useCallback(
    (patch: Partial<SocietyDiscoveryParams>) => {
      replaceParams({ ...filtersFromUrl(), ...patch });
    },
    [filtersFromUrl, replaceParams],
  );

  const patchHome = useCallback((patch: Partial<SocietyDiscoveryParams>) => {
    setHomeDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const openSheet = () => {
    const base =
      mode === "home"
        ? { ...homeDraft, search: searchInput.trim() || undefined }
        : current;
    setSheetDraft(base);
    setSheetOpen(true);
  };

  const applySheet = () => {
    if (mode === "home") {
      setHomeDraft(sheetDraft);
      if (sheetDraft.search !== undefined) {
        setSearchInput(sheetDraft.search);
      }
    } else {
      // Tier A stays on the bar for directory — only commit Tier B from sheet.
      replaceParams({
        ...filtersFromUrl(),
        verificationTier: sheetDraft.verificationTier,
        authority: sheetDraft.authority,
        sizeLabel: sheetDraft.sizeLabel,
        developmentStage: sheetDraft.developmentStage,
        bookingStatus: sheetDraft.bookingStatus,
        sort: sheetDraft.sort,
      });
    }
    setSheetOpen(false);
  };

  const resetAll = () => {
    setSearchInput("");
    setPrevUrlSearch("");
    setHomeDraft({});
    setSheetDraft({});
    setSheetOpen(false);
    if (mode === "directory") {
      startTransition(() => {
        router.replace(pathname, { scroll: false });
      });
    }
  };

  const submitHome = () => {
    const next: SocietyDiscoveryParams = {
      ...homeDraft,
      search: searchInput.trim() || undefined,
    };
    const params = serializeSocietyDiscoveryParams(next);
    const href =
      params.size > 0 ? `/societies?${params.toString()}` : "/societies";
    startTransition(() => {
      router.push(href);
    });
  };

  const sheetFilterCount = countFiltersBehindSheet(activeFilters, mode);
  const showReset = hasAnyDiscoveryFilter(activeFilters, searchInput);

  const cityOptions = facets.cities.map((city) => ({
    value: city.slug,
    label: city.label,
  }));

  const budgetValue = matchBudgetPresetId(
    activeFilters.priceMinPkr,
    activeFilters.priceMaxPkr,
  );

  const barClassName = cn(
    "flex flex-col gap-4 rounded-xl border border-border-base bg-surface-card p-5",
    mode === "home" && "shadow-sm transition-shadow duration-150 ease-default",
    mode === "home" && isFocused && "shadow-md",
  );

  return (
    <div
      className={barClassName}
      aria-busy={isPending}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
    >
      {facetsError ? (
        <p
          role="status"
          className="rounded-md border border-warning-border bg-warning-bg px-3 py-2 font-sans text-xs text-warning-text"
        >
          Filter options could not be loaded. You can still search — option
          lists may be empty until this recovers.
        </p>
      ) : null}

      <div
        className={cn(
          "grid gap-4",
          mode === "home"
            ? "md:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)_auto_auto]"
            : "md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]",
        )}
      >
        <div className="flex flex-col gap-1.5 md:col-span-1">
          <Label htmlFor={`${baseId}-search`}>Search</Label>
          <Input
            id={`${baseId}-search`}
            type="search"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              if (mode === "home") {
                patchHome({
                  search: event.target.value.trim() || undefined,
                });
              }
            }}
            onKeyDown={(event) => {
              if (mode === "home" && event.key === "Enter") {
                event.preventDefault();
                submitHome();
              }
            }}
            placeholder="Search societies or cities"
            aria-label="Search societies or cities"
            autoComplete="off"
            className={cn(
              "h-11 min-h-[44px]",
              mode === "home" && "min-h-12 h-12",
            )}
          />
        </div>

        <DualSelect
          id={`${baseId}-city`}
          label="City"
          value={activeFilters.citySlug ?? DISCOVERY_ALL}
          allLabel="All cities"
          ariaLabel="Filter by city"
          options={cityOptions}
          onChange={(value) => {
            const citySlug = value === DISCOVERY_ALL ? undefined : value;
            if (mode === "home") {
              patchHome({ citySlug });
            } else {
              patchDirectory({ citySlug });
            }
          }}
        />

        {mode === "directory" ? (
          <>
            <DualSelect
              id={`${baseId}-budget`}
              label="Budget"
              value={budgetValue ?? DISCOVERY_ALL}
              allLabel="Any budget"
              ariaLabel="Filter by budget"
              options={BUDGET_PRESETS.map((preset) => ({
                value: preset.id,
                label: preset.label,
              }))}
              onChange={(value) => {
                if (value === DISCOVERY_ALL) {
                  patchDirectory({
                    priceMinPkr: undefined,
                    priceMaxPkr: undefined,
                  });
                  return;
                }
                patchDirectory(budgetPresetToPriceBounds(value));
              }}
            />
            <DualSelect
              id={`${baseId}-plot-type`}
              label="Plot type"
              value={activeFilters.plotType ?? DISCOVERY_ALL}
              allLabel="Any type"
              ariaLabel="Filter by plot type"
              options={PLOT_TYPE_OPTIONS}
              onChange={(value) =>
                patchDirectory({
                  plotType:
                    value === DISCOVERY_ALL || !isPlotType(value)
                      ? undefined
                      : value,
                })
              }
            />
          </>
        ) : null}

        <div className="flex flex-col gap-1.5 justify-end">
          <span className="hidden md:block h-4" aria-hidden="true" />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              className="min-h-[44px]"
              onClick={openSheet}
              aria-label={
                sheetFilterCount > 0
                  ? `Filters, ${sheetFilterCount} active`
                  : "Filters"
              }
            >
              <Filter aria-hidden="true" className="h-4 w-4" />
              Filters
              {sheetFilterCount > 0 ? (
                <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-md bg-brand-navy px-1.5 font-mono text-xs text-text-inverse">
                  {sheetFilterCount}
                </span>
              ) : null}
            </Button>

            {mode === "home" ? (
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="min-h-[44px]"
                onClick={submitHome}
              >
                <Search aria-hidden="true" className="h-4 w-4" />
                Search
              </Button>
            ) : null}

            {showReset ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-[44px]"
                onClick={resetAll}
              >
                <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                Reset
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent
          className={cn(
            "max-h-[85vh] overflow-y-auto",
            // Mobile: bottom sheet; desktop: centered dialog.
            "inset-x-0 bottom-0 top-auto left-0 max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-2xl",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl",
          )}
        >
          <DialogHeader>
            <DialogTitle>
              {mode === "directory" ? "More filters" : "Filters"}
            </DialogTitle>
            <DialogDescription>
              {mode === "directory"
                ? "Verification, authority, size, stage, booking, and sort."
                : "Budget, plot type, and additional filters. Applied when you search."}
            </DialogDescription>
          </DialogHeader>

          <SheetFields
            idPrefix={`${baseId}-sheet`}
            draft={sheetDraft}
            onPatch={(patch) =>
              setSheetDraft((prev) => ({ ...prev, ...patch }))
            }
            facets={facets}
            includeBudgetAndPlotType={mode === "home"}
          />

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={resetAll}>
              Reset
            </Button>
            <Button type="button" variant="primary" onClick={applySheet}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
