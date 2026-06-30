import type { Metadata } from "next";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { ComplianceSettingsForm } from "@/components/society/compliance-settings-form";
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
  }

  const { society } = overview;

  return (
    <div>
      <PageHeader
        title="Compliance settings"
        description="Upload LOP and NOC references and manage your HSMS integration status."
      />
      <Card className="p-6">
        <ComplianceSettingsForm
          societyId={admin.societyId}
          lopReferenceNo={society.lopReferenceNo}
          nocReferenceNo={society.nocReferenceNo}
          hsmsLinked={society.hsmsLinked}
          verificationTier={society.verificationTier}
        />
      </Card>
    </div>
  );
}
