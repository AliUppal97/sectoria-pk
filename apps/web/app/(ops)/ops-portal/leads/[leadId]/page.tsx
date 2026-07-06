import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadStatus } from "@sectoria/types";
import { Button, StatusBadge, formatDate, formatPKR } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { MarkDealWonAction } from "@/components/ops/mark-deal-won-action";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Lead detail",
  robots: { index: false, follow: false },
};

export default async function OpsLeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  const api = await getAuthedApi();

  let lead;
  try {
    lead = await api.lead.getById({ leadId });
  } catch {
    notFound();
  }

  const quotes = await api.quote.listForLead({ leadId });

  return (
    <div>
      <PageHeader
        title={lead.name}
        description={`${lead.source} · ${formatDate(lead.createdAt)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <MarkDealWonAction
              leadId={lead.id}
              leadStatus={lead.status}
              quotes={quotes}
            />
            <Button asChild>
              <Link href={`/ops-portal/quotes/new?leadId=${lead.id}`}>
                Create quote
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border-base bg-surface-card p-6">
          <h2 className="font-sans text-md font-semibold">Contact</h2>
          <dl className="mt-4 space-y-2 font-sans text-sm">
            <div>
              <dt className="text-text-tertiary">Phone</dt>
              <dd className="font-mono text-text-primary">{lead.phone}</dd>
            </div>
            {lead.email ? (
              <div>
                <dt className="text-text-tertiary">Email</dt>
                <dd>{lead.email}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-text-tertiary">Status</dt>
              <dd>
                <StatusBadge
                  variant={lead.status === LeadStatus.WON ? "success" : "info"}
                >
                  {lead.status}
                </StatusBadge>
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-border-base bg-surface-card p-6">
          <h2 className="font-sans text-md font-semibold">Quotes</h2>
          {quotes.length === 0 ? (
            <p className="mt-3 font-sans text-sm text-text-secondary">
              No quotes yet.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {quotes.map((quote) => (
                <li
                  key={quote.id}
                  className="flex items-center justify-between rounded-lg border border-border-base px-3 py-2"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold">
                      {formatPKR(quote.quotedPricePkr)}
                    </p>
                    <p className="font-sans text-xs text-text-tertiary">
                      Spread {formatPKR(quote.spreadPkr)} · {quote.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
