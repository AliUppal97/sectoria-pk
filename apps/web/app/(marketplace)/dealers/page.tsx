import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { Button, EmptyState, ErrorState, JsonLd } from "@sectoria/ui";
import { DealerCard } from "@/components/marketplace/dealer-card";
import { SectionHeading } from "@/components/marketplace/section-heading";
import { getApi } from "@/lib/trpc/server";
import { load } from "@/lib/fetch";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Verified property dealers in Pakistan",
    description: `Find society-authorized property dealers on ${SITE.name}. Every dealer's DNFBP AML/CFT registration status and completed-deal history is shown upfront.`,
    path: "/dealers",
    keywords: ["verified property dealers Pakistan", "DNFBP registered dealer"],
  });
}

export default async function DealersPage() {
  const dealers = await load(() => getApi().dealer.list());

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Dealers", path: "/dealers" },
        ])}
      />

      <SectionHeading
        eyebrow="Directory"
        title="Verified dealers"
        description="Society-authorized sales partners. Each profile shows DNFBP registration and a trust score weighted heavily toward verified completed transactions."
      />

      <div className="mt-8">
        {dealers.status === "error" ? (
          <ErrorState
            title="We couldn't load dealers"
            message="The dealer directory is temporarily unavailable. Please try again shortly."
            supportHref={SITE.supportPath}
          />
        ) : dealers.data.length === 0 ? (
          <EmptyState
            icon={Users}
            heading="No dealers listed yet"
            description="Authorized dealers will appear here as they complete DNFBP verification."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/societies">Browse societies instead</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dealers.data.map((dealer) => (
              <DealerCard key={dealer.id} dealer={dealer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
