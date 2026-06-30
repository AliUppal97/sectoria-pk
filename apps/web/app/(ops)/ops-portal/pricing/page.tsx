import type { Metadata } from "next";
import { formatPKR, StatusBadge } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Margin matrix",
  robots: { index: false, follow: false },
};

export default async function OpsPricingPage() {
  const api = await getAuthedApi();
  const matrix = await api.dealerNetSheet.listMatrix();

  return (
    <div>
      <PageHeader
        title="Dealer net margin matrix"
        description="Confidential wholesale pricing — never shown to buyers."
      />

      <div className="overflow-x-auto rounded-xl border border-border-base">
        <table className="min-w-full divide-y divide-border-base text-left font-sans text-sm">
          <thead className="bg-surface-subtle">
            <tr>
              <th className="px-4 py-3 font-medium">Society</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Dealer</th>
              <th className="px-4 py-3 font-medium">List</th>
              <th className="px-4 py-3 font-medium">Net</th>
              <th className="px-4 py-3 font-medium">Freshness</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-base bg-surface-card">
            {matrix.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">{row.societyName}</td>
                <td className="px-4 py-3">{row.categoryLabel}</td>
                <td className="px-4 py-3">{row.dealerAgencyName}</td>
                <td className="px-4 py-3 font-mono">{formatPKR(row.listPricePkr)}</td>
                <td className="px-4 py-3 font-mono">{formatPKR(row.netPricePkr)}</td>
                <td className="px-4 py-3">
                  <StatusBadge variant={row.isStale ? "warning" : "success"}>
                    {row.isStale ? "Stale" : "Current"}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
