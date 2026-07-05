import type { Metadata } from "next";
import Link from "next/link";
import { UserRole } from "@sectoria/types";
import { Button } from "@sectoria/ui";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { PageHeader } from "@/components/buyer/page-header";
import { auth } from "@/auth";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Ops overview",
  robots: { index: false, follow: false },
};

export default async function OpsPortalPage() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === UserRole.SUPER_ADMIN;

  const api = await getAuthedApi();
  const [leads, fulfillments, remittance] = await Promise.all([
    api.lead.list(),
    api.fulfillment.listAll(),
    isSuperAdmin
      ? api.quote.remittanceSummary()
      : Promise.resolve(null),
  ]);

  const newLeads = leads.filter((l) => l.status === "NEW").length;
  const pendingFulfillment = fulfillments.filter(
    (f) => f.status === "PENDING",
  ).length;

  return (
    <div>
      <PageHeader
        title="Ops CRM"
        description="Lead pipeline, dealer net pricing, and fulfillment coordination."
      />

      <BentoGrid>
        <BentoCell size="anchor" tone="navy" className="flex flex-col">
          <p className="font-sans text-2xs uppercase tracking-wide text-text-inverse/50">
            New leads
          </p>
          <p className="mt-2 font-mono text-4xl font-bold text-text-inverse">
            {newLeads}
          </p>
          <Button asChild variant="success" className="mt-auto w-fit">
            <Link href="/ops-portal/leads">Open pipeline</Link>
          </Button>
        </BentoCell>
        <BentoCell size="unit">
          <p className="font-sans text-2xs uppercase text-text-tertiary">
            Pending fulfillment
          </p>
          <p className="mt-2 font-mono text-3xl font-bold">{pendingFulfillment}</p>
        </BentoCell>
        {remittance ? (
          <BentoCell size="unit">
            <p className="font-sans text-2xs uppercase text-text-tertiary">
              Platform spread (accepted)
            </p>
            <p className="mt-2 font-mono text-lg font-bold">
              PKR {remittance.totalSpreadPkr.toLocaleString("en-PK")}
            </p>
          </BentoCell>
        ) : null}
      </BentoGrid>
    </div>
  );
}
