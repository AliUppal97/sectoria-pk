import type { Metadata } from "next";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { InventoryCategoryForm } from "@/components/society/inventory-category-form";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";

export const metadata: Metadata = {
  title: "New category",
  robots: { index: false, follow: false },
};

export default async function NewCategoryPage() {
  const admin = await getCurrentSocietyAdmin();

  return (
    <div>
      <PageHeader
        title="Add inventory category"
        description="Define a new plot category with pricing, size, and allocation rules."
      />
      <Card className="p-6">
        <InventoryCategoryForm societyId={admin.societyId} mode="create" />
      </Card>
    </div>
  );
}
