"use client";

import { useCallback, useMemo, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  formatPKR,
} from "@sectoria/ui";
import type { SocietySummary } from "@/lib/marketplace";

/**
 * Society comparison tool (design spec §5.2, §8.3). Dynamically imported by the
 * compare page so it doesn't weigh down society-profile bundles.
 *
 * The compared set lives in the URL (`/compare?ids=slug-a,slug-b`) so a
 * comparison is shareable/bookmarkable (routing-and-navigation.mdc). The table
 * has a sticky attribute column, "—" for missing values (never blank), and an
 * emerald highlight on the best cell per comparable row. Mobile shows two
 * columns and scrolls horizontally beyond that, capped at three societies.
 */

const MAX_COMPARE = 3;
const TIER_RANK: Record<SocietySummary["verificationTier"], number> = {
  PENDING: 0,
  VERIFIED: 1,
  HSMS_LINKED: 2,
};
const TIER_LABEL: Record<SocietySummary["verificationTier"], string> = {
  PENDING: "Verification pending",
  VERIFIED: "LOP + NOC verified",
  HSMS_LINKED: "HSMS live-linked",
};

interface CompareRow {
  readonly label: string;
  /** Display value per society. */
  readonly value: (society: SocietySummary) => string;
  /**
   * Comparable score (higher = better) for best-cell highlighting, or null for
   * rows that have no "best" (e.g. location).
   */
  readonly score?: (society: SocietySummary) => number | null;
}

const ROWS: readonly CompareRow[] = [
  { label: "City", value: (s) => s.city },
  { label: "Authority", value: (s) => s.authority },
  {
    label: "Verification",
    value: (s) => TIER_LABEL[s.verificationTier],
    score: (s) => TIER_RANK[s.verificationTier],
  },
  {
    label: "HSMS linked",
    value: (s) => (s.hsmsLinked ? "Yes" : "No"),
    score: (s) => (s.hsmsLinked ? 1 : 0),
  },
  {
    label: "Development",
    value: (s) => `${s.developmentStage} (${s.developmentPct}%)`,
    score: (s) => s.developmentPct,
  },
  {
    label: "Starting price",
    value: (s) =>
      s.startingPrice !== null ? formatPKR(s.startingPrice) : "—",
    // Lower price is better; negate so "higher score" stays "best".
    score: (s) => (s.startingPrice !== null ? -s.startingPrice : null),
  },
  {
    label: "Inventory",
    value: (s) => `${s.categoryCount} categories`,
    score: (s) => s.categoryCount,
  },
  {
    label: "Buyer rating",
    value: (s) => (s.rating ? `${s.rating.value.toFixed(1)} / 5` : "—"),
    score: (s) => s.rating?.value ?? null,
  },
];

/** Index of the single best society for a row, or null if there is no winner. */
function bestIndex(
  row: CompareRow,
  societies: readonly SocietySummary[],
): number | null {
  if (!row.score) return null;
  let bestIdx = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  let tie = false;
  for (let index = 0; index < societies.length; index += 1) {
    const society = societies[index];
    if (society === undefined) continue;
    const score = row.score(society);
    if (score === null) continue;
    if (score > bestScore) {
      bestIdx = index;
      bestScore = score;
      tie = false;
    } else if (score === bestScore) {
      tie = true;
    }
  }
  if (bestIdx === -1 || tie) return null;
  return bestIdx;
}

export interface CompareToolProps {
  readonly societies: readonly SocietySummary[];
  /** Every society, to populate the "add to comparison" picker. */
  readonly options: readonly { slug: string; name: string }[];
}

export function CompareTool({ societies, options }: CompareToolProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedSlugs = useMemo(
    () => societies.map((society) => society.slug),
    [societies],
  );

  const setIds = useCallback(
    (slugs: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (slugs.length > 0) {
        params.set("ids", slugs.join(","));
      } else {
        params.delete("ids");
      }
      startTransition(() => {
        router.replace(params.size > 0 ? `${pathname}?${params}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const addSociety = (slug: string) => setIds([...selectedSlugs, slug]);
  const removeSociety = (slug: string) =>
    setIds(selectedSlugs.filter((s) => s !== slug));

  const available = options.filter(
    (option) => !selectedSlugs.includes(option.slug),
  );
  const canAddMore = societies.length < MAX_COMPARE && available.length > 0;

  const bestPerRow = ROWS.map((row) => bestIndex(row, societies));

  return (
    <div className="flex flex-col gap-4" aria-busy={isPending}>
      {canAddMore ? (
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <label
            htmlFor="add-society"
            className="font-sans text-xs font-medium text-text-secondary"
          >
            Add a society to compare
          </label>
          <Select value="" onValueChange={addSociety}>
            <SelectTrigger id="add-society">
              <SelectValue placeholder="Choose a society…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((option) => (
                <SelectItem key={option.slug} value={option.slug}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {societies.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-card px-6 py-16 text-center">
          <p className="font-sans text-md font-semibold text-text-primary">
            Pick societies to start comparing
          </p>
          <p className="max-w-sm font-sans text-sm text-text-secondary">
            Add two or three societies above to see their approvals, pricing and
            buyer ratings side by side.
          </p>
        </div>
      ) : (
      <div className="overflow-x-auto rounded-xl border border-border-base">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Side-by-side comparison of selected housing societies
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[8rem] bg-surface-subtle p-3 font-sans text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary"
              >
                Attribute
              </th>
              {societies.map((society) => (
                <th
                  key={society.slug}
                  scope="col"
                  className="min-w-[12rem] border-l border-border-base bg-surface-subtle p-3 align-top"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-sans text-sm font-bold text-text-primary">
                      {society.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSociety(society.slug)}
                      aria-label={`Remove ${society.name} from comparison`}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-card hover:text-danger"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, rowIndex) => (
              <tr key={row.label} className="even:bg-surface-subtle/40">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-inherit p-3 font-sans text-xs font-medium text-text-secondary"
                >
                  {row.label}
                </th>
                {societies.map((society, columnIndex) => {
                  const isBest = bestPerRow[rowIndex] === columnIndex;
                  return (
                    <td
                      key={society.slug}
                      className={cn(
                        "border-l border-border-base p-3 font-sans text-sm",
                        isBest
                          ? "bg-success-bg font-semibold text-success-text"
                          : "text-text-primary",
                      )}
                    >
                      {row.value(society)}
                      {isBest ? (
                        <span className="sr-only"> (best in comparison)</span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {societies.length === 1 ? (
        <p className="font-sans text-sm text-text-tertiary">
          Add at least one more society to compare side by side.
        </p>
      ) : null}

      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/societies">Browse more societies</Link>
        </Button>
      </div>
    </div>
  );
}
