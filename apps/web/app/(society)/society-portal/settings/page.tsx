import type { Metadata } from "next";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { ComplianceSettingsForm } from "@/components/society/compliance-settings-form";
import { LocationLandForm } from "@/components/society/location-land-form";
import { SocietyLandmarksEditor } from "@/components/society/society-landmarks-editor";
import { BookingStatusForm } from "@/components/society/booking-status-form";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { denyIfForbidden } from "@/lib/society/trpc-errors";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SocietySettingsPage() {
  const admin = await getCurrentSocietyAdmin();
  const api = await getAuthedApi();

  let settings;
  let landmarks;
  try {
    [settings, landmarks] = await Promise.all([
      api.society.getPortalSettings({ societyId: admin.societyId }),
      api.landmark.listForAdmin({ societyId: admin.societyId }),
    ]);
  } catch (error) {
    denyIfForbidden(error);
    throw error;
  }

  const boundaryText =
    settings.boundaryGeoJson !== null && settings.boundaryGeoJson !== undefined
      ? JSON.stringify(settings.boundaryGeoJson, null, 2)
      : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Society settings"
        description="Manage compliance, location, nearby landmarks, land area, and booking availability shown on your public profile."
      />
      <Card className="p-6">
        <h2 className="mb-4 font-sans text-md font-semibold text-text-primary">
          Compliance
        </h2>
        <ComplianceSettingsForm
          societyId={admin.societyId}
          lopReferenceNo={settings.lopReferenceNo ?? null}
          nocReferenceNo={settings.nocReferenceNo ?? null}
          hsmsLinked={settings.hsmsLinked}
          verificationTier={settings.verificationTier}
        />
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 font-sans text-md font-semibold text-text-primary">
          Location & land
        </h2>
        <LocationLandForm
          societyId={admin.societyId}
          addressLine={settings.addressLine ?? null}
          district={settings.district ?? null}
          latitude={settings.latitude ?? null}
          longitude={settings.longitude ?? null}
          totalLandKanal={settings.totalLandKanal ?? null}
          developedLandKanal={settings.developedLandKanal ?? null}
          boundaryGeoJson={boundaryText}
        />
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 font-sans text-md font-semibold text-text-primary">
          Nearby landmarks
        </h2>
        <SocietyLandmarksEditor
          societyId={admin.societyId}
          initialLandmarks={
            landmarks as Parameters<
              typeof SocietyLandmarksEditor
            >[0]["initialLandmarks"]
          }
        />
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 font-sans text-md font-semibold text-text-primary">
          Booking status
        </h2>
        <BookingStatusForm
          societyId={admin.societyId}
          bookingStatus={settings.bookingStatus}
          bookingOpensAt={settings.bookingOpensAt ?? null}
          bookingClosesAt={settings.bookingClosesAt ?? null}
        />
      </Card>
    </div>
  );
}
