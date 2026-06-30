import type { Metadata } from "next";
import { PageHeader } from "@/components/buyer/page-header";
import { LeadPipelineList } from "@/components/dealer/lead-pipeline-list";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Lead pipeline",
  robots: { index: false, follow: false },
};

export default async function DealerLeadsPage() {
  const api = await getAuthedApi();
  const leads = await api.dealer.listLeads();

  return (
    <div>
      <PageHeader
        title="Lead pipeline"
        description="Buyer enquiries from societies you're authorized to sell. Each lead shows NADRA verification and FBR ATL status with the tax implication for that buyer."
      />
      <LeadPipelineList leads={leads} />
    </div>
  );
}
