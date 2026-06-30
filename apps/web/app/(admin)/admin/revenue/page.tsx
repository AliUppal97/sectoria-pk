import type { Metadata } from "next";
import Link from "next/link";
import { formatPKR } from "@sectoria/ui";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { PageHeader } from "@/components/buyer/page-header";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Revenue dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminRevenuePage() {
  const api = await getAuthedApi();
  const [revenue, concierge] = await Promise.all([
    api.admin.revenueDashboard(),
    api.quote.remittanceSummary(),
  ]);

  return (
    <div>
      <PageHeader
        title="Revenue dashboard"
        description="Legacy escrow commission plus concierge platform spread and servicing collections."
        action={
          <Link
            href="/admin/remittance"
            className="font-sans text-sm font-medium text-text-accent hover:underline"
          >
            Remittance queue
          </Link>
        }
      />

      <BentoGrid>
        <BentoCell size="anchor" tone="navy" className="flex flex-col">
          <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-inverse/50">
            Concierge platform spread
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-text-inverse sm:text-4xl">
            {formatPKR(concierge.totalSpreadPkr)}
          </p>
          <p className="mt-2 font-sans text-sm text-text-inverse/70">
            Across {concierge.quoteCount} token-paid quotes
          </p>
        </BentoCell>

        <BentoCell size="unit">
          <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">
            Collected on platform
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-text-primary">
            {formatPKR(concierge.totalCollectedPkr)}
          </p>
        </BentoCell>

        <BentoCell size="unit">
          <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">
            Dealer net payable
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-text-primary">
            {formatPKR(concierge.totalDealerNetPkr)}
          </p>
        </BentoCell>

        <BentoCell size="anchor" tone="navy" className="flex flex-col">
          <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-inverse/50">
            Legacy escrow released
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-text-inverse sm:text-4xl">
            {formatPKR(revenue.totalEscrowReleasedPkr)}
          </p>
          <p className="mt-2 font-sans text-sm text-text-inverse/70">
            Across {revenue.completedTransferCount} completed transfers
          </p>
        </BentoCell>

        <BentoCell size="wide">
          <h2 className="font-sans text-md font-semibold text-text-primary">
            Commission by society (legacy)
          </h2>
          {revenue.commissionBySociety.length === 0 ? (
            <p className="mt-3 font-sans text-sm text-text-secondary">
              No completed transfers with dealer commission yet.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col divide-y divide-border-base">
              {revenue.commissionBySociety.map((row) => (
                <li
                  key={row.societyId}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-sans text-sm font-medium text-text-primary">
                      {row.societyName}
                    </p>
                    <p className="font-sans text-xs text-text-tertiary">
                      {row.transferCount}{" "}
                      {row.transferCount === 1 ? "transfer" : "transfers"}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-semibold text-text-primary">
                    {formatPKR(row.commissionPkr)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </BentoCell>
      </BentoGrid>
    </div>
  );
}
