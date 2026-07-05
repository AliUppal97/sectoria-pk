import type { Metadata } from "next";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { SocietyProfileBasicsForm } from "@/components/society/society-profile-basics-form";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { denyIfForbidden } from "@/lib/society/trpc-errors";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function SocietyProfilePage() {
  const admin = await getCurrentSocietyAdmin();
  const api = await getAuthedApi();

  let profile;
  try {
    profile = await api.society.getEditableProfile({ societyId: admin.societyId });
  } catch (error) {
    denyIfForbidden(error);
    throw error;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile basics"
        description="Edit the description, development progress, and media links buyers see on your public page."
      />
      <Card className="p-6">
        <SocietyProfileBasicsForm
          societyId={admin.societyId}
          initial={profile}
        />
      </Card>
    </div>
  );
}
