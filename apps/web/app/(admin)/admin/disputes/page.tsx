import type { Metadata } from "next";
import { PageHeader } from "@/components/buyer/page-header";
import { DisputesPanel } from "@/components/admin/disputes-panel";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Plot disputes",
  robots: { index: false, follow: false },
};

export default async function AdminDisputesPage() {
  const api = await getAuthedApi();
  const [disputed, disputable] = await Promise.all([
    api.admin.listDisputedPlots(),
    api.admin.listDisputablePlots(),
  ]);

  return (
    <div>
      <PageHeader
        title="Plot disputes"
        description="Flag contested plots and resolve disputes when ownership is confirmed. Every action requires a written reason in the audit ledger."
      />
      <DisputesPanel disputed={disputed} disputable={disputable} />
    </div>
  );
}
