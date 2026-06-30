import type { Metadata } from "next";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { SocietyUpdateForm } from "@/components/society/society-update-form";
import { SocietyUpdatesAdminList } from "@/components/society/society-updates-admin-list";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { denyIfForbidden } from "@/lib/society/trpc-errors";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Updates",
  robots: { index: false, follow: false },
};

export default async function SocietyUpdatesPage() {
  const admin = await getCurrentSocietyAdmin();
  const api = await getAuthedApi();

  let updates;
  try {
    updates = await api.societyUpdate.listForAdmin({
      societyId: admin.societyId,
    });
  } catch (error) {
    denyIfForbidden(error);
    throw error;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Society updates"
        description="Publish NOC milestones, possession news, and booking announcements on your public profile."
      />
      <Card className="p-6">
        <h2 className="mb-4 font-sans text-md font-semibold text-text-primary">
          New update
        </h2>
        <SocietyUpdateForm societyId={admin.societyId} />
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 font-sans text-md font-semibold text-text-primary">
          Published & draft updates
        </h2>
        <SocietyUpdatesAdminList
          updates={
            updates as Parameters<typeof SocietyUpdatesAdminList>[0]["updates"]
          }
          societyId={admin.societyId}
        />
      </Card>
    </div>
  );
}
