import type { Metadata } from "next";
import { notFound, forbidden } from "next/navigation";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { InventoryCategoryForm } from "@/components/society/inventory-category-form";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { isForbiddenError } from "@/lib/society/trpc-errors";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Edit category",
  robots: { index: false, follow: false },
};

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const admin = await getCurrentSocietyAdmin();
  const api = await getAuthedApi();

  let category;
  try {
    category = await api.inventoryCategory.getById({ categoryId });
  } catch (error) {
    if (isForbiddenError(error)) forbidden();
    notFound();
  }

  if (category.societyId !== admin.societyId) {
    forbidden();
  }

  return (
    <div>
      <PageHeader
        title={`Edit ${category.phase} · ${category.block}`}
        description={`${category.sizeLabel} — update pricing and availability.`}
      />
      <Card className="p-6">
        <InventoryCategoryForm
          societyId={admin.societyId}
          mode="edit"
          categoryId={categoryId}
          initial={{
            slug: category.slug,
            phase: category.phase,
            block: category.block,
            plotType: category.plotType,
            sizeLabel: category.sizeLabel,
            sizeSqft: category.sizeSqft,
            pricePerSqft: category.pricePerSqft,
            totalUnits: category.totalUnits,
            allocationStrategy: category.allocationStrategy,
            fbrValuationZone: category.fbrValuationZone,
          }}
        />
      </Card>
    </div>
  );
}
