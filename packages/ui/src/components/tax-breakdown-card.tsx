import type { TaxBreakdown } from "@sectoria/types";
import { formatPKR } from "../lib/format-pkr";
import { Skeleton } from "./skeleton";
import { cn } from "../lib/utils";

export interface TaxBreakdownCardProps {
  /** The computed breakdown from `@sectoria/domain/tax` (amounts in whole rupees). */
  breakdown: TaxBreakdown;
  /** Heading above the itemized rows. */
  title?: string;
  className?: string;
}

/**
 * The tax-invoice surface (design spec §5.4), reused across the public tax
 * calculator and the booking wizard. Renders the itemized line items in
 * the monospace face (financial data) with an emphasized total row.
 *
 * Display-only: it formats and lays out a `TaxBreakdown` it is handed. It
 * never computes tax — that lives in `@sectoria/domain/tax`.
 */
export function TaxBreakdownCard({
  breakdown,
  title = "Tax & fee breakdown",
  className,
}: TaxBreakdownCardProps) {
  return (
    <div
      className={cn(
        // §5.4 specifies a 10px radius; rounded-md (8px) is the nearest token.
        "rounded-md border border-border-base bg-surface-subtle p-4 font-mono",
        className,
      )}
    >
      <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">
        {title}
      </p>

      <dl>
        {breakdown.breakdown.map((item) => (
          <div
            key={item.label}
            className="flex items-baseline justify-between gap-4 border-b border-border-base py-1.25 text-sm"
          >
            <dt className="text-text-secondary">{item.label}</dt>
            <dd className="font-semibold text-text-primary">
              {formatPKR(item.amount)}
            </dd>
          </div>
        ))}

        {/* Total — 2px navy top border, Inter 700 label + 18px navy value. */}
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t-2 border-brand-navy-mid pt-2">
          <dt className="font-sans text-base font-bold text-text-primary">
            Total payable
          </dt>
          <dd className="font-sans text-lg font-bold text-brand-navy">
            {formatPKR(breakdown.total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/** Content-shaped loading placeholder matching {@link TaxBreakdownCard}. */
export function TaxBreakdownCardSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "rounded-md border border-border-base bg-surface-subtle p-4",
        className,
      )}
    >
      <Skeleton className="mb-3 h-3 w-40" />
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex justify-between border-b border-border-base py-2"
        >
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
      <div className="mt-2 flex justify-between border-t-2 border-brand-navy-mid pt-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
    </div>
  );
}
