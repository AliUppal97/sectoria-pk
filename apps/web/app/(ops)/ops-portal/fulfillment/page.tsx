import type { Metadata } from "next";
import { StatusBadge, formatPKR } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Fulfillment",
  robots: { index: false, follow: false },
};

export default async function OpsFulfillmentPage() {
  const api = await getAuthedApi();
  const orders = await api.fulfillment.listAll();

  return (
    <div>
      <PageHeader
        title="Fulfillment queue"
        description="Post-token orders assigned to authorized dealers."
      />

      <ul className="flex flex-col divide-y divide-border-base rounded-xl border border-border-base bg-surface-card">
        {orders.map((order) => (
          <li key={order.id} className="px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-sm font-semibold">{order.orderRef}</p>
                <p className="font-sans text-xs text-text-tertiary">
                  {order.dealerAgencyName} · {order.leadName}
                </p>
              </div>
              <StatusBadge variant="info">{order.status}</StatusBadge>
            </div>
            <p className="mt-2 font-sans text-sm text-text-secondary">
              Quote {formatPKR(order.quotedPricePkr)} · Spread{" "}
              {formatPKR(order.spreadPkr)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
