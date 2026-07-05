import type { Metadata } from "next";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { SocietyMediaEditor } from "@/components/society/society-media-editor";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { denyIfForbidden } from "@/lib/society/trpc-errors";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Media",
  robots: { index: false, follow: false },
};

export default async function SocietyMediaPage() {
  const admin = await getCurrentSocietyAdmin();
  const api = await getAuthedApi();

  let media;
  try {
    media = await api.media.listForAdmin({ societyId: admin.societyId });
  } catch (error) {
    denyIfForbidden(error);
    throw error;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Media library"
        description="Upload and reorder hero images, gallery photos, progress shots, and floor plans for your public profile."
      />
      <Card className="p-6">
        <SocietyMediaEditor
          societyId={admin.societyId}
          initialMedia={
            media as Parameters<typeof SocietyMediaEditor>[0]["initialMedia"]
          }
        />
      </Card>
    </div>
  );
}
