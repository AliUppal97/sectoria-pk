import Link from "next/link";
import { MapPin } from "lucide-react";
import { StatusBadge, buttonVariants, cn, formatPKR } from "@sectoria/ui";
import type { SocietySummary } from "@/lib/marketplace";
import { societyPath } from "@/lib/marketplace";
import { SocietyThumbnail } from "./society-thumbnail";
import { VerificationTierBadge } from "./verification-badge";
import { RatingStars } from "./rating-stars";

/**
 * The primary marketplace card (design spec §5.1): bento cell, image area,
 * verification badge row, title, location, starting price, and a full-width
 * CTA. The whole card is one link; the CTA renders as a styled span (not a
 * nested button/anchor, which would be invalid markup). Hover lifts the card
 * and shifts its border toward navy, per the spec.
 */
export function SocietyCard({ society }: { society: SocietySummary }) {
  return (
    <Link
      href={societyPath(society.citySlug, society.slug)}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border-base bg-surface-card shadow-sm",
        "transition-all duration-200 ease-default",
        "hover:-translate-y-0.5 hover:border-brand-navy-light hover:shadow-md",
      )}
    >
      <SocietyThumbnail name={society.name} />

      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <VerificationTierBadge tier={society.verificationTier} />
          <StatusBadge
            variant="neutral"
            title={`Approved by the ${society.authority}`}
          >
            {society.authority}
          </StatusBadge>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="font-sans text-lg font-bold leading-tight text-text-primary">
            {society.name}
          </h3>
          <p className="flex items-center gap-1 font-sans text-sm text-text-tertiary">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {society.city}
          </p>
        </div>

        {society.rating ? (
          <RatingStars
            rating={society.rating.value}
            count={society.rating.count}
          />
        ) : (
          <p className="font-sans text-xs text-text-tertiary">
            No reviews yet
          </p>
        )}

        <dl className="mt-1 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <dt className="font-sans text-xs text-text-tertiary">
              {society.startingPrice !== null ? "Starting from" : "Pricing"}
            </dt>
            <dd className="font-mono text-md font-semibold text-text-primary">
              {society.startingPrice !== null
                ? formatPKR(society.startingPrice)
                : "On request"}
            </dd>
          </div>
          <div className="flex flex-col items-end">
            <dt className="font-sans text-xs text-text-tertiary">Inventory</dt>
            <dd className="font-sans text-sm font-medium text-text-secondary">
              {society.categoryCount}{" "}
              {society.categoryCount === 1 ? "category" : "categories"}
            </dd>
          </div>
        </dl>

        <span
          aria-hidden="true"
          className={cn(
            buttonVariants({ variant: "ghost", size: "default" }),
            "mt-2 w-full group-hover:border-brand-navy-light group-hover:bg-surface-subtle",
          )}
        >
          View society
        </span>
      </div>
    </Link>
  );
}
