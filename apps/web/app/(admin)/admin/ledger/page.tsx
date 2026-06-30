import type { Metadata } from "next";
import { PageHeader } from "@/components/buyer/page-header";
import { LedgerViewer } from "@/components/admin/ledger-viewer";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Audit ledger",
  robots: { index: false, follow: false },
};

export default async function AdminLedgerPage() {
  const api = await getAuthedApi();
  const events = await api.admin.listLedger({ limit: 100 });

  return (
    <div>
      <PageHeader
        title="Audit ledger"
        description="Append-only record of every state change across the platform. Filter by entity, event type, or date range."
      />
      <LedgerViewer initialEvents={events} />
    </div>
  );
}
