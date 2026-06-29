import Link from "next/link";
import { Briefcase } from "lucide-react";
import { StatusBadge, TrustBadge, buttonVariants, cn } from "@sectoria/ui";
import type { DealerProfile } from "@sectoria/database";
import { dealerPath } from "@/lib/marketplace";

/**
 * A dealer directory card. Surfaces the strongest at-a-glance trust signals:
 * DNFBP registration status (an explained TrustBadge when verified, a pending
 * StatusBadge otherwise) and the count of completed deals. The full trust score
 * is computed on the dealer's own profile page.
 */
export function DealerCard({ dealer }: { dealer: DealerProfile }) {
  return (
    <Link
      href={dealerPath(dealer.slug)}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-border-base bg-surface-card p-6 shadow-sm",
        "transition-all duration-200 ease-default hover:-translate-y-0.5 hover:border-brand-navy-light hover:shadow-md",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-subtle">
          <Briefcase aria-hidden="true" className="h-5 w-5 text-text-secondary" />
        </span>
        <h3 className="font-sans text-lg font-bold leading-tight text-text-primary">
          {dealer.agencyName}
        </h3>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {dealer.dnfbpVerified ? (
          <TrustBadge variant="dnfbp" />
        ) : (
          <StatusBadge
            variant="warning"
            title="This dealer's DNFBP AML/CFT registration has not been verified yet."
          >
            DNFBP pending
          </StatusBadge>
        )}
      </div>

      <dl className="flex items-end justify-between">
        <div className="flex flex-col">
          <dt className="font-sans text-xs text-text-tertiary">
            Completed deals
          </dt>
          <dd className="font-mono text-md font-semibold text-text-primary">
            {dealer.completedDeals}
          </dd>
        </div>
      </dl>

      <span
        aria-hidden="true"
        className={cn(
          buttonVariants({ variant: "ghost", size: "default" }),
          "mt-1 w-full group-hover:border-brand-navy-light group-hover:bg-surface-subtle",
        )}
      >
        View profile
      </span>
    </Link>
  );
}
