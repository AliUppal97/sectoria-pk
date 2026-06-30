import type { Metadata } from "next";
import { StatusBadge } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { FulfillmentActions } from "@/components/dealer/fulfillment-actions";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Fulfillment",
  robots: { index: false, follow: false },
};

export default async function DealerFulfillmentPage() {
  const api = await getAuthedApi();
  const orders = await api.fulfillment.listForDealer();

  return (
    <div>
      <PageHeader
        title="Fulfillment orders"
        description="Allocate plots after Sectoria confirms token payment. No buyer contact details are shown."
      />

      {orders.length === 0 ? (
        <p className="font-sans text-sm text-text-secondary">
          No fulfillment orders yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border border-border-base bg-surface-card p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold">{order.orderRef}</p>
                <StatusBadge variant="info">{order.status}</StatusBadge>
              </div>
              <p className="mt-1 font-sans text-sm text-text-secondary">
                {order.societyName} · {order.categoryLabel}
              </p>
              {order.status === "PENDING" ? (
                <FulfillmentActions orderId={order.id} orderRef={order.orderRef} />
              ) : order.plotRef ? (
                <p className="mt-2 font-mono text-xs text-text-tertiary">
                  Plot {order.plotRef}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
