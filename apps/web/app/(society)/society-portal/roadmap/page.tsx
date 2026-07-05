import type { Metadata } from "next";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { SocietyMilestonesEditor } from "@/components/society/society-milestones-editor";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { denyIfForbidden } from "@/lib/society/trpc-errors";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Roadmap",
  robots: { index: false, follow: false },
};

export default async function SocietyRoadmapPage() {
  const admin = await getCurrentSocietyAdmin();
  const api = await getAuthedApi();

  let milestones;
  try {
    milestones = await api.milestone.listForAdmin({ societyId: admin.societyId });
  } catch (error) {
    denyIfForbidden(error);
    throw error;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Development roadmap"
        description="Add dated milestones with status — NOC approval, balloting, infrastructure, and possession."
      />
      <Card className="p-6">
        <SocietyMilestonesEditor
          societyId={admin.societyId}
          initialMilestones={
            milestones as Parameters<
              typeof SocietyMilestonesEditor
            >[0]["initialMilestones"]
          }
        />
      </Card>
    </div>
  );
}
