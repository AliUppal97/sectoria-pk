import type { Metadata } from "next";
import { PageHeader } from "@/components/buyer/page-header";
import { QuoteBuilderForm } from "@/components/ops/quote-builder-form";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Create quote",
  robots: { index: false, follow: false },
};

export default async function OpsQuoteNewPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const { leadId } = await searchParams;
  const api = await getAuthedApi();
  const matrix = await api.dealerNetSheet.listMatrix();

  return (
    <div>
      <PageHeader
        title="Create quote"
        description="Pick dealer net pricing and set the customer-facing quote."
      />
      <QuoteBuilderForm leadId={leadId ?? ""} matrix={matrix} />
    </div>
  );
}
