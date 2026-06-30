import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge, formatDate } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Lead pipeline",
  robots: { index: false, follow: false },
};

const STATUS_VARIANT = {
  NEW: "info",
  CONTACTED: "warning",
  QUOTED: "info",
  WON: "success",
  LOST: "danger",
} as const;

export default async function OpsLeadsPage() {
  const api = await getAuthedApi();
  const leads = await api.lead.list();

  return (
    <div>
      <PageHeader
        title="Lead pipeline"
        description="Quote requests from compare, category pages, and support."
      />

      {leads.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary">No leads yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border-base rounded-xl border border-border-base bg-surface-card">
          {leads.map((lead) => (
            <li key={lead.id}>
              <Link
                href={`/ops-portal/leads/${lead.id}`}
                className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-sans text-sm font-medium text-text-primary">
                    {lead.name}
                  </p>
                  <p className="font-mono text-xs text-text-tertiary">
                    {lead.phone.replace(/(\+\d{3})(\d{3})(\d+)/, "$1 *** $3")}
                  </p>
                  <p className="font-sans text-xs text-text-tertiary">
                    {lead.source} · {formatDate(lead.createdAt)}
                  </p>
                </div>
                <StatusBadge
                  variant={
                    STATUS_VARIANT[lead.status as keyof typeof STATUS_VARIANT] ??
                    "info"
                  }
                >
                  {lead.status}
                </StatusBadge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
