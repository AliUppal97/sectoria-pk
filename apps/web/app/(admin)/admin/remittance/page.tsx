import type { Metadata } from "next";
import { formatPKR } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { RemittanceActions } from "@/components/admin/remittance-actions";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Remittance queue",
  robots: { index: false, follow: false },
};

export default async function AdminRemittancePage() {
  const api = await getAuthedApi();
  const pending = await api.quote.listPendingRemittance();

  return (
    <div>
      <PageHeader
        title="Remittance queue"
        description="Quotes with confirmed token payments awaiting dealer net remittance. Platform spread is retained per quote."
      />

      {pending.length === 0 ? (
        <p className="mt-6 font-sans text-sm text-text-secondary">
          No pending remittances — all token-paid quotes have been recorded.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {pending.map((row) => (
            <li
              key={row.quoteId}
              className="flex flex-col gap-3 rounded-xl border border-border-base bg-surface-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-sans text-sm font-semibold text-text-primary">
                  {row.societyName}
                </p>
                <p className="font-sans text-xs text-text-tertiary">
                  Dealer net {formatPKR(row.dealerNetPkr)} · Platform spread{" "}
                  {formatPKR(row.spreadPkr)} · Quoted{" "}
                  {formatPKR(row.quotedPricePkr)}
                </p>
              </div>
              <RemittanceActions quoteId={row.quoteId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
