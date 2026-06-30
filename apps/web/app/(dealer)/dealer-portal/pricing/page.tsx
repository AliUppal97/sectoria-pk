import type { Metadata } from "next";
import { PageHeader } from "@/components/buyer/page-header";
import { DealerNetSheetForm } from "@/components/dealer/dealer-net-sheet-form";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Net pricing",
  robots: { index: false, follow: false },
};

export default async function DealerPricingPage() {
  const api = await getAuthedApi();
  const [categories, sheets] = await Promise.all([
    api.dealer.listAuthorizedCategories(),
    api.dealerNetSheet.listMine(),
  ]);

  const sheetByCategory = new Map(sheets.map((s) => [s.categoryId, s.netPricePkr]));

  const authorizedCategories = categories.map((cat) => ({
    id: cat.id,
    label: cat.label,
    currentNetPkr: sheetByCategory.get(cat.id) ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Confidential net pricing"
        description="Update wholesale rates for categories you're authorized to sell. Buyers never see these numbers."
      />
      <DealerNetSheetForm authorizedCategories={authorizedCategories} />
    </div>
  );
}
