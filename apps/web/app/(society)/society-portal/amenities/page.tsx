import type { Metadata } from "next";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { SocietyAmenitiesEditor } from "@/components/society/society-amenities-editor";
import { SocietyHighlightsEditor } from "@/components/society/society-highlights-editor";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { denyIfForbidden } from "@/lib/society/trpc-errors";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Amenities & highlights",
  robots: { index: false, follow: false },
};

export default async function SocietyAmenitiesPage() {
  const admin = await getCurrentSocietyAdmin();
  const api = await getAuthedApi();

  let amenities;
  let highlights;
  try {
    [amenities, highlights] = await Promise.all([
      api.societyFeature.listAmenitiesForAdmin({ societyId: admin.societyId }),
      api.societyFeature.listHighlightsForAdmin({ societyId: admin.societyId }),
    ]);
  } catch (error) {
    denyIfForbidden(error);
    throw error;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Amenities & highlights"
        description="Rich amenity cards and headline stats shown on your public profile."
      />
      <Card className="p-6">
        <h2 className="mb-4 font-sans text-md font-semibold text-text-primary">
          Amenity cards
        </h2>
        <SocietyAmenitiesEditor
          societyId={admin.societyId}
          initialAmenities={
            amenities as Parameters<
              typeof SocietyAmenitiesEditor
            >[0]["initialAmenities"]
          }
        />
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 font-sans text-md font-semibold text-text-primary">
          Stat highlights
        </h2>
        <SocietyHighlightsEditor
          societyId={admin.societyId}
          initialHighlights={
            highlights as Parameters<
              typeof SocietyHighlightsEditor
            >[0]["initialHighlights"]
          }
        />
      </Card>
    </div>
  );
}
