import type { Metadata } from "next";
import { PageHeader } from "@/components/buyer/page-header";
import { PartnersPanel } from "@/components/society/partners-panel";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Partner authorization",
  robots: { index: false, follow: false },
};

export default async function PartnersPage() {
  const admin = await getCurrentSocietyAdmin();
  const api = await getAuthedApi();

  const [partners, dealers, categories] = await Promise.all([
    api.dealer.listPartners({}),
    api.dealer.list({ verifiedOnly: false }),
    api.inventoryCategory.listBySociety({ societyId: admin.societyId }),
  ]);

  const categoryOptions = categories.map((c) => ({
    id: c.id,
    label: `${c.phase} · ${c.block} · ${c.sizeLabel}`,
  }));

  const dealerOptions = dealers.map((d) => ({
    id: d.id,
    agencyName: d.agencyName,
    dnfbpVerified: d.dnfbpVerified,
  }));

  return (
    <div>
      <PageHeader
        title="Partner authorization"
        description="Authorize dealers to sell your inventory and manage active or revoked partnerships."
      />
      <PartnersPanel
        societyId={admin.societyId}
        partners={partners}
        dealers={dealerOptions}
        categories={categoryOptions}
      />
    </div>
  );
}
