import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LedgerEvent } from "@sectoria/types";
import { Button, formatDate } from "@sectoria/ui";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { PageHeader } from "@/components/buyer/page-header";
import { getCurrentAdmin } from "@/lib/admin/current-admin";
import { getAuthedApi } from "@/lib/trpc/server";
import { LEDGER_LABEL } from "@/lib/ledger-display";

export const metadata: Metadata = {
  title: "Platform admin",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  const [admin, api] = await Promise.all([getCurrentAdmin(), getAuthedApi()]);
  const overview = await api.admin.dashboardOverview();
  const firstName = admin.name.split(" ")[0] ?? admin.name;

  return (
    <div>
      <PageHeader
        title={`Platform overview`}
        description={`Signed in as ${firstName}. Cross-tenant verification, disputes, and revenue at a glance.`}
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/verification-queue">
              Open verification queue
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <BentoGrid>
        <BentoCell size="anchor" tone="navy" className="flex flex-col">
          <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-inverse/50">
            Verification queue
          </p>
          <p className="mt-2 font-mono text-4xl font-bold text-text-inverse">
            {overview.pendingSocieties + overview.pendingDealers}
          </p>
          <p className="mt-1 font-sans text-sm text-text-inverse/70">
            {overview.pendingSocieties} societies · {overview.pendingDealers}{" "}
            dealers awaiting review
          </p>
          <div className="mt-auto pt-6">
            <Button asChild size="sm" variant="ghost">
              <Link href="/admin/verification-queue">Review now</Link>
            </Button>
          </div>
        </BentoCell>

        <MetricCell label="Completed transfers" value={overview.completedTransfers} />
        <MetricCell label="Transfers this month" value={overview.transfersThisMonth} />
        <MetricCell label="Active disputes" value={overview.disputedPlots} />
        <MetricCell label="Pending societies" value={overview.pendingSocieties} />

        <BentoCell size="wide">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-sans text-md font-semibold text-text-primary">
              Recent audit events
            </h2>
            <Link
              href="/admin/ledger"
              className="font-sans text-xs font-medium text-text-accent hover:underline"
            >
              Full ledger
            </Link>
          </div>

          {overview.recentEvents.length === 0 ? (
            <p className="font-sans text-sm text-text-secondary">
              No ledger events recorded yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-base">
              {overview.recentEvents.map((event: LedgerEvent) => (
                <li key={event.id} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-medium text-text-primary">
                      {LEDGER_LABEL[event.type]}
                    </p>
                    <p className="truncate font-mono text-xs text-text-tertiary">
                      {event.entityId}
                    </p>
                  </div>
                  <p className="shrink-0 font-sans text-xs text-text-tertiary">
                    {formatDate(event.createdAt)}
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

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <BentoCell size="unit">
      <p className="font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-tertiary">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-bold text-text-primary">
        {value}
      </p>
    </BentoCell>
  );
}
