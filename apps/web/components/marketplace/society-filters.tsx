"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sectoria/ui";

/**
 * Society directory filters. Filter state lives in the URL (search params) so a
 * filtered view is shareable and crawlable (routing-and-navigation.mdc,
 * seo.mdc) — not in client-only state. Changing a filter rewrites the query
 * string; the server component re-runs the filtered query and re-renders.
 *
 * Radix Select forbids an empty-string item value, so the "all" sentinel maps
 * to *removing* the param.
 */

const ALL = "all";

const TIER_OPTIONS = [
  { value: "HSMS_LINKED", label: "HSMS live-linked" },
  { value: "VERIFIED", label: "LOP + NOC verified" },
  { value: "PENDING", label: "Verification pending" },
] as const;

export interface SocietyFiltersProps {
  readonly cities: readonly { slug: string; label: string }[];
  readonly authorities: readonly string[];
  readonly current: {
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

  const hasActiveFilter =
    Boolean(current.citySlug) ||
    Boolean(current.verificationTier) ||
    Boolean(current.authority);

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-border-base bg-surface-card p-5"
      aria-busy={isPending}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filter-city">City</Label>
          <Select
            value={current.citySlug ?? ALL}
            onValueChange={(value) => setParam("citySlug", value)}
          >
            <SelectTrigger id="filter-city" aria-label="Filter by city">
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
          <Select
            value={current.verificationTier ?? ALL}
            onValueChange={(value) => setParam("verificationTier", value)}
          >
            <SelectTrigger id="filter-tier" aria-label="Filter by verification tier">
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
          <Select
            value={current.authority ?? ALL}
            onValueChange={(value) => setParam("authority", value)}
          >
            <SelectTrigger id="filter-authority" aria-label="Filter by development authority">
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
            onClick={() =>
              startTransition(() =>
                router.replace(pathname, { scroll: false }),
              )
            }
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            Reset filters
          </Button>
        </div>
      ) : null}
    </div>
  );
}
