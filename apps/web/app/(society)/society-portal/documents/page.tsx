import type { Metadata } from "next";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { SocietyDocumentsEditor } from "@/components/society/society-documents-editor";
import { getCurrentSocietyAdmin } from "@/lib/society/current-admin";
import { denyIfForbidden } from "@/lib/society/trpc-errors";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Documents",
  robots: { index: false, follow: false },
};

export default async function SocietyDocumentsPage() {
  const admin = await getCurrentSocietyAdmin();
  const api = await getAuthedApi();

  let documents;
  try {
    documents = await api.document.listForAdmin({ societyId: admin.societyId });
  } catch (error) {
    denyIfForbidden(error);
    throw error;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Documents"
        description="Manage master plans, brochures, payment plans, and compliance documents. LOP/NOC stay private by default."
      />
      <Card className="p-6">
        <SocietyDocumentsEditor
          societyId={admin.societyId}
          initialDocuments={
            documents as Parameters<
              typeof SocietyDocumentsEditor
            >[0]["initialDocuments"]
          }
        />
      </Card>
    </div>
  );
}
