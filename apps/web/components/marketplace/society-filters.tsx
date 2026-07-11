"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useDebouncedValue,
} from "@sectoria/ui";

/**
 * Society directory filters. Filter state lives in the URL (search params) so a
 * filtered view is shareable and crawlable (routing-and-navigation.mdc,
 * seo.mdc) — not in client-only state. Changing a filter rewrites the query
 * string; the server component re-runs the filtered query and re-renders.
 *
 * Free-text search uses debounced `router.replace` (≥300ms) via
 * `useDebouncedValue` — not submit-on-Enter (discovery-search §2.1 directory).
 *
 * Radix Select forbids an empty-string item value, so the "all" sentinel maps
 * to *removing* the param. Below `md`, native `<select>` is used because Radix
 * dropdowns are unreliable on iOS Safari touch.
 *
 * Public verification options exclude `PENDING` (foundations §2) — ops/admin
 * surfaces may still filter by it via the API.
 */

const ALL = "all";

/** Directory search debounce — locked ≥300ms (discovery-search §2.1). */
const SEARCH_DEBOUNCE_MS = 300;

const TIER_OPTIONS = [
  { value: "HSMS_LINKED", label: "HSMS live-linked" },
  { value: "VERIFIED", label: "LOP + NOC verified" },
] as const;

const nativeSelectClassName =
  "flex h-11 min-h-[44px] w-full cursor-pointer touch-manipulation items-center rounded-md border border-border-base bg-surface-card px-3 font-sans text-sm text-text-primary md:hidden";

export interface SocietyFiltersProps {
  readonly cities: readonly { slug: string; label: string }[];
  readonly authorities: readonly string[];
  readonly current: {
    readonly search?: string;
    readonly citySlug?: string;
    readonly verificationTier?: string;
    readonly authority?: string;
  };
}

export function SocietyFilters({
  cities,
  authorities,
  current,
}: SocietyFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(current.search ?? "");
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  /** Last search value we wrote to the URL — distinguishes Reset/back from typing. */
  const lastWrittenSearch = useRef(current.search ?? "");

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === ALL) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      startTransition(() => {
        router.replace(params.size > 0 ? `${pathname}?${params}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  // External URL change (Reset filters, browser back) — resync the input.
  useEffect(() => {
    const urlSearch = current.search ?? "";
    if (urlSearch !== lastWrittenSearch.current) {
      lastWrittenSearch.current = urlSearch;
      setSearchInput(urlSearch);
    }
  }, [current.search]);

  // Debounced replace for free-text search (directory locked behavior).
  useEffect(() => {
    const next = debouncedSearch.trim();
    const existing = searchParams.get("search") ?? "";
    if (next === existing) return;

    lastWrittenSearch.current = next;
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) {
      params.set("search", next);
    } else {
      params.delete("search");
    }
    startTransition(() => {
      router.replace(params.size > 0 ? `${pathname}?${params}` : pathname, {
        scroll: false,
      });
    });
  }, [debouncedSearch, pathname, router, searchParams]);

  const hasActiveFilter =
    Boolean(current.search) ||
    Boolean(current.citySlug) ||
    Boolean(current.verificationTier) ||
    Boolean(current.authority) ||
    searchInput.trim().length > 0;

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-border-base bg-surface-card p-5"
      aria-busy={isPending}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-search">Search</Label>
        <Input
          id="filter-search"
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search societies or cities"
          aria-label="Search societies or cities"
          autoComplete="off"
          className="h-11"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-city">City</Label>
          <select
            id="filter-city"
            className={nativeSelectClassName}
            value={current.citySlug ?? ALL}
            onChange={(event) => setParam("citySlug", event.target.value)}
            aria-label="Filter by city"
          >
            <option value={ALL}>All cities</option>
            {cities.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.label}
              </option>
            ))}
          </select>
          <Select
            value={current.citySlug ?? ALL}
            onValueChange={(value) => setParam("citySlug", value)}
          >
            <SelectTrigger
              className="hidden md:flex"
              aria-label="Filter by city"
            >
              <SelectValue placeholder="All cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All cities</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city.slug} value={city.slug}>
                  {city.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-tier">Verification</Label>
          <select
            id="filter-tier"
            className={nativeSelectClassName}
            value={current.verificationTier ?? ALL}
            onChange={(event) =>
              setParam("verificationTier", event.target.value)
            }
            aria-label="Filter by verification tier"
          >
            <option value={ALL}>Any verification</option>
            {TIER_OPTIONS.map((tier) => (
              <option key={tier.value} value={tier.value}>
                {tier.label}
              </option>
            ))}
          </select>
          <Select
            value={current.verificationTier ?? ALL}
            onValueChange={(value) => setParam("verificationTier", value)}
          >
            <SelectTrigger
              className="hidden md:flex"
              aria-label="Filter by verification tier"
            >
              <SelectValue placeholder="Any verification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any verification</SelectItem>
              {TIER_OPTIONS.map((tier) => (
                <SelectItem key={tier.value} value={tier.value}>
                  {tier.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-authority">Authority</Label>
          <select
            id="filter-authority"
            className={nativeSelectClassName}
            value={current.authority ?? ALL}
            onChange={(event) => setParam("authority", event.target.value)}
            aria-label="Filter by development authority"
          >
            <option value={ALL}>All authorities</option>
            {authorities.map((authority) => (
              <option key={authority} value={authority}>
                {authority}
              </option>
            ))}
          </select>
          <Select
            value={current.authority ?? ALL}
            onValueChange={(value) => setParam("authority", value)}
          >
            <SelectTrigger
              className="hidden md:flex"
              aria-label="Filter by development authority"
            >
              <SelectValue placeholder="All authorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All authorities</SelectItem>
              {authorities.map((authority) => (
                <SelectItem key={authority} value={authority}>
                  {authority}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasActiveFilter ? (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              lastWrittenSearch.current = "";
              setSearchInput("");
              startTransition(() =>
                router.replace(pathname, { scroll: false }),
              );
            }}
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            Reset filters
          </Button>
        </div>
      ) : null}
    </div>
  );
}
