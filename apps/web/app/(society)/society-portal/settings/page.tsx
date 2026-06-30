import type { Metadata } from "next";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { ComplianceSettingsForm } from "@/components/society/compliance-settings-form";
import { LocationLandForm } from "@/components/society/location-land-form";
import { BookingStatusForm } from "@/components/society/booking-status-form";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { denyIfForbidden } from "@/lib/society/trpc-errors";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SocietySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ societyId?: string }>;
}) {
  const [{ societyId: querySocietyId }, admin] = await Promise.all([
    searchParams,
    getCurrentSocietyAdmin(),
  ]);

  const api = await getAuthedApi();
  let overview;
  try {
    overview = await api.society.getPortalOverview({
      ...(querySocietyId !== undefined ? { societyId: querySocietyId } : {}),
    });
  } catch (error) {
    denyIfForbidden(error);
    throw error;
  }

  const { society: portalSociety } = overview;
  let society;
  try {
    society = await api.society.getBySlug({ slug: portalSociety.slug });
  } catch (error) {
    denyIfForbidden(error);
    throw error;
  }

  const boundaryText =
    society.boundaryGeoJson !== null && society.boundaryGeoJson !== undefined
      ? JSON.stringify(society.boundaryGeoJson, null, 2)
      : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Society settings"
        description="Manage compliance, location, land area, and booking availability shown on your public profile."
      />
      <Card className="p-6">
        <h2 className="mb-4 font-sans text-md font-semibold text-text-primary">
          Compliance
        </h2>
        <ComplianceSettingsForm
          societyId={admin.societyId}
          lopReferenceNo={society.lopReferenceNo ?? null}
          nocReferenceNo={society.nocReferenceNo ?? null}
          hsmsLinked={society.hsmsLinked}
          verificationTier={society.verificationTier}
        />
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 font-sans text-md font-semibold text-text-primary">
          Location & land
        </h2>
        <LocationLandForm
          societyId={admin.societyId}
          addressLine={society.addressLine ?? null}
          district={society.district ?? null}
          latitude={society.latitude ?? null}
          longitude={society.longitude ?? null}
          totalLandKanal={society.totalLandKanal ?? null}
          developedLandKanal={society.developedLandKanal ?? null}
          boundaryGeoJson={boundaryText}
        />
      </Card>
      <Card className="p-6">
        <h2 className="mb-4 font-sans text-md font-semibold text-text-primary">
          Booking status
        </h2>
        <BookingStatusForm
          societyId={admin.societyId}
          bookingStatus={society.bookingStatus}
          bookingOpensAt={society.bookingOpensAt ?? null}
          bookingClosesAt={society.bookingClosesAt ?? null}
        />
      </Card>
    </div>
  );
}
