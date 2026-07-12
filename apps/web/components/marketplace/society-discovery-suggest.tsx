"use client";

import { useEffect, useState } from "react";
import { Building2, MapPin } from "lucide-react";
import { cn } from "@sectoria/ui";
import type { VerificationTier } from "@sectoria/types";
import { trpcVanilla } from "@/lib/trpc/react";
import { VERIFICATION_TIER_META } from "@/lib/marketplace";

/** Min query length before `society.suggest` fires (discovery-search §3.6). */
export const SUGGEST_MIN_CHARS = 2;

export interface SuggestSocietyItem {
  readonly slug: string;
  readonly name: string;
  readonly citySlug: string;
  readonly city: string;
  readonly verificationTier: VerificationTier;
}

export interface SuggestCityItem {
  readonly slug: string;
  readonly label: string;
}

export interface SocietySuggestResult {
  readonly societies: readonly SuggestSocietyItem[];
  readonly cities: readonly SuggestCityItem[];
}

export type SuggestOption =
  | { readonly kind: "society"; readonly society: SuggestSocietyItem }
  | { readonly kind: "city"; readonly city: SuggestCityItem };

/** Stable option id for aria-activedescendant (must match listbox option ids). */
export function suggestOptionId(listboxId: string, index: number): string {
  return `${listboxId}-opt-${index}`;
}

/** Flattens societies then cities for a single keyboard-navigable listbox. */
export function flattenSuggestOptions(
  result: SocietySuggestResult | null,
): SuggestOption[] {
  if (result === null) return [];
  return [
    ...result.societies.map(
      (society): SuggestOption => ({ kind: "society", society }),
    ),
    ...result.cities.map((city): SuggestOption => ({ kind: "city", city })),
  ];
}

/**
 * Fetches `society.suggest` when `q` is ≥ {@link SUGGEST_MIN_CHARS} and
 * `enabled`. Uses the vanilla tRPC client — marketplace has no React Query
 * provider (keeps the public shell lean).
 *
 * Loading/error are derived from the last completed fetch key so we never
 * call setState synchronously at the top of the effect (react-hooks /
 * set-state-in-effect).
 */
export function useSocietySuggest(
  q: string,
  enabled: boolean,
): {
  readonly data: SocietySuggestResult | null;
  readonly isLoading: boolean;
  readonly isError: boolean;
} {
  const trimmed = q.trim();
  const shouldFetch = enabled && trimmed.length >= SUGGEST_MIN_CHARS;

  const [cache, setCache] = useState<{
    readonly q: string;
    readonly data: SocietySuggestResult | null;
    readonly status: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (!shouldFetch) return;

    let cancelled = false;

    void trpcVanilla.society.suggest
      .query({ q: trimmed })
      .then((result) => {
        if (cancelled) return;
        setCache({ q: trimmed, data: result, status: "success" });
      })
      .catch(() => {
        if (cancelled) return;
        setCache({ q: trimmed, data: null, status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [trimmed, shouldFetch]);

  const cacheMatches = cache !== null && cache.q === trimmed;
  const isError = shouldFetch && cacheMatches && cache.status === "error";
  const isLoading =
    shouldFetch && !(cacheMatches && (cache.status === "success" || cache.status === "error"));
  const data =
    shouldFetch && cacheMatches && cache.status === "success" ? cache.data : null;

  return { data, isLoading, isError };
}

export interface SocietyDiscoverySuggestListboxProps {
  readonly listboxId: string;
  readonly options: readonly SuggestOption[];
  readonly activeIndex: number;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly onSelect: (option: SuggestOption) => void;
  readonly onActiveIndexChange: (index: number) => void;
}

/**
 * Combobox listbox for discovery typeahead. Keyboard navigation is owned by
 * the search input (aria-activedescendant); options use mousedown so blur
 * doesn't race the click.
 */
export function SocietyDiscoverySuggestListbox({
  listboxId,
  options,
  activeIndex,
  isLoading,
  isError,
  onSelect,
  onActiveIndexChange,
}: SocietyDiscoverySuggestListboxProps) {
  if (isLoading) {
    return (
      <div
        id={listboxId}
        role="listbox"
        aria-label="Society and city suggestions"
        className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-border-base bg-surface-card shadow-md"
      >
        <ul className="space-y-2 p-3" aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <li
              key={row}
              className="h-10 animate-pulse rounded-md bg-surface-subtle motion-reduce:animate-none"
            />
          ))}
        </ul>
        <p className="sr-only">Loading suggestions</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        id={listboxId}
        role="listbox"
        aria-label="Society and city suggestions"
        className="absolute inset-x-0 top-full z-50 mt-1 rounded-xl border border-border-base bg-surface-card p-3 shadow-md"
      >
        <p className="font-sans text-sm text-text-secondary" role="status">
          Suggestions could not be loaded. You can still press Search.
        </p>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div
        id={listboxId}
        role="listbox"
        aria-label="Society and city suggestions"
        className="absolute inset-x-0 top-full z-50 mt-1 rounded-xl border border-border-base bg-surface-card p-3 shadow-md"
      >
        <p className="font-sans text-sm text-text-secondary" role="status">
          No societies or cities match this search.
        </p>
      </div>
    );
  }

  const societyOptions = options
    .map((option, index) => ({ option, index }))
    .filter(
      (entry): entry is { option: Extract<SuggestOption, { kind: "society" }>; index: number } =>
        entry.option.kind === "society",
    );
  const cityOptions = options
    .map((option, index) => ({ option, index }))
    .filter(
      (entry): entry is { option: Extract<SuggestOption, { kind: "city" }>; index: number } =>
        entry.option.kind === "city",
    );

  return (
    <div
      id={listboxId}
      role="listbox"
      aria-label="Society and city suggestions"
      className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border-base bg-surface-card py-1 shadow-md"
    >
      {societyOptions.length > 0 ? (
        <div>
          <p className="px-3 pb-1 pt-2 font-sans text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Societies
          </p>
          {societyOptions.map(({ option, index }) => {
            const optionId = suggestOptionId(listboxId, index);
            const isActive = index === activeIndex;
            const tierMeta =
              VERIFICATION_TIER_META[option.society.verificationTier];
            return (
              <button
                key={`society-${option.society.slug}`}
                type="button"
                id={optionId}
                role="option"
                aria-selected={isActive}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-2.5 text-left font-sans transition-colors duration-150 ease-default",
                  isActive
                    ? "bg-surface-subtle text-text-primary"
                    : "text-text-primary hover:bg-surface-subtle",
                )}
                onMouseEnter={() => onActiveIndexChange(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(option);
                }}
              >
                <Building2
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {option.society.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-text-secondary">
                    {option.society.city}
                    {" · "}
                    <span title={tierMeta.explanation}>{tierMeta.label}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {cityOptions.length > 0 ? (
        <div>
          <p className="px-3 pb-1 pt-2 font-sans text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Cities
          </p>
          {cityOptions.map(({ option, index }) => {
            const optionId = suggestOptionId(listboxId, index);
            const isActive = index === activeIndex;
            return (
              <button
                key={`city-${option.city.slug}`}
                type="button"
                id={optionId}
                role="option"
                aria-selected={isActive}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left font-sans transition-colors duration-150 ease-default",
                  isActive
                    ? "bg-surface-subtle text-text-primary"
                    : "text-text-primary hover:bg-surface-subtle",
                )}
                onMouseEnter={() => onActiveIndexChange(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(option);
                }}
              >
                <MapPin
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-text-tertiary"
                />
                <span className="truncate text-sm font-medium">
                  {option.city.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
