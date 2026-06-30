import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Button, EmptyState, formatDate } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { QuoteActions } from "@/components/buyer/quote-actions";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "My quotes",
  robots: { index: false, follow: false },
};

export default async function BuyerQuotesPage() {
  const api = await getAuthedApi();
  const [quotes, leads] = await Promise.all([
    api.quote.listForBuyer(),
    api.lead.listMine(),
  ]);

  return (
    <div>
      <PageHeader
        title="My quotes"
        description="Price offers from Sectoria advisors. Accept a quote and pay your booking token on-platform."
      />

      {quotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          heading="No quotes yet"
          description="Request the best price from a society page or our support form — quotes appear here when an advisor sends them."
          action={
            <Button asChild size="sm">
              <Link href="/support">Request a quote</Link>
            </Button>
          }
        />
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {quotes.map((quote) => (
            <li
              key={quote.id}
              className="rounded-xl border border-border-base bg-surface-card p-5"
            >
              <p className="font-sans text-xs text-text-tertiary">
                Valid until {formatDate(quote.validUntil)} · Ref{" "}
                {quote.id.slice(-8).toUpperCase()}
              </p>
              <div className="mt-3">
                <QuoteActions quote={quote} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {leads.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-sans text-md font-semibold text-text-primary">
            Quote requests
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-border-base rounded-xl border border-border-base bg-surface-card">
            {leads.map((lead) => (
              <li
                key={lead.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-sans text-sm font-medium text-text-primary">
                    {lead.status.replace("_", " ")}
                  </p>
                  <p className="font-sans text-xs text-text-tertiary">
                    Submitted {formatDate(lead.createdAt)}
                  </p>
                </div>
                <span className="font-mono text-xs text-text-tertiary">
                  {lead.id.slice(-8).toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
