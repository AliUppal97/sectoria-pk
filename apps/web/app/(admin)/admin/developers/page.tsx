import type { Metadata } from "next";
import { Card } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { DeveloperConsole } from "@/components/admin/developer-console";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Developers",
  robots: { index: false, follow: false },
};

export default async function AdminDevelopersPage() {
  const api = await getAuthedApi();
  const developers = await api.developer.list();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Developers"
        description="Manage platform-curated developer profiles and their project track records."
      />
      <Card className="p-6">
        <DeveloperConsole
          initialDevelopers={
            developers as Parameters<
              typeof DeveloperConsole
            >[0]["initialDevelopers"]
          }
        />
      </Card>
    </div>
  );
}
