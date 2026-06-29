import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StatusBadge, cn, formatPKR } from "@sectoria/ui";
import { categoryPath } from "@/lib/marketplace";

/**
 * Serializable view of an inventory category for marketplace cards. Prices are
 * pre-resolved to numbers (never Decimal) so this can also cross into client
 * components if needed.
 */
export interface CategoryView {
  readonly id: string;
  readonly slug: string;
  readonly phase: string;
  readonly block: string;
  readonly plotType: "RESIDENTIAL" | "COMMERCIAL";
  readonly sizeLabel: string;
  readonly sizeSqft: number;
  readonly pricePerSqft: number;
  readonly totalPrice: number;
  readonly totalUnits: number;
  readonly availableUnits: number;
  readonly allocationStrategy: "FIFO" | "BALLOT";
}

/**
 * An inventory-category card on a society profile. Shows size, plot type, the
 * computed total price (per-sqft × area), and availability with a clear sold-out
 * state. The allocation strategy is labelled (FIFO vs ballot) because it changes
 * how a buyer secures a plot.
 */
export function CategoryCard({
  citySlug,
  societySlug,
  category,
}: {
  citySlug: string;
  societySlug: string;
  category: CategoryView;
}) {
  const soldOut = category.availableUnits <= 0;
  return (
    <Link
      href={categoryPath(citySlug, societySlug, category.slug)}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-border-base bg-surface-card p-5 shadow-sm",
        "transition-all duration-200 ease-default hover:-translate-y-0.5 hover:border-brand-navy-light hover:shadow-md",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge variant="info">
          {category.plotType === "COMMERCIAL" ? "Commercial" : "Residential"}
        </StatusBadge>
        <StatusBadge
          variant="neutral"
          title={
            category.allocationStrategy === "BALLOT"
              ? "Plots are assigned by a seeded, auditable ballot"
              : "Plots are assigned first-come, first-served"
          }
        >
          {category.allocationStrategy === "BALLOT" ? "Ballot" : "FIFO"}
        </StatusBadge>
      </div>

      <div className="flex flex-col gap-0.5">
        <h3 className="font-sans text-lg font-bold text-text-primary">
          {category.sizeLabel}
        </h3>
        <p className="font-sans text-sm text-text-tertiary">
          {category.phase} · {category.block}
        </p>
      </div>

      <dl className="flex items-end justify-between gap-2">
        <div className="flex flex-col">
          <dt className="font-sans text-xs text-text-tertiary">Total price</dt>
          <dd className="font-mono text-md font-semibold text-text-primary">
            {formatPKR(category.totalPrice)}
          </dd>
        </div>
        <div className="flex flex-col items-end">
          <dt className="font-sans text-xs text-text-tertiary">Per sq ft</dt>
          <dd className="font-mono text-sm text-text-secondary">
            {formatPKR(category.pricePerSqft)}
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between">
        {soldOut ? (
          <StatusBadge variant="danger">Sold out</StatusBadge>
        ) : (
          <StatusBadge variant="success">
            {category.availableUnits} of {category.totalUnits} available
          </StatusBadge>
        )}
        <span className="inline-flex items-center gap-1 font-sans text-sm font-medium text-text-accent">
          Details
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}
