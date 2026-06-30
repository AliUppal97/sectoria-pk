import type { Metadata } from "next";
import { PageHeader } from "@/components/buyer/page-header";
import { VerificationReviewPanel } from "@/components/admin/verification-review-panel";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Verification queue",
  robots: { index: false, follow: false },
};

export default async function VerificationQueuePage() {
  const api = await getAuthedApi();
  const [societies, dealers] = await Promise.all([
    api.admin.pendingSocietyVerifications(),
    api.admin.pendingDealerVerifications(),
  ]);

  return (
    <div>
      <PageHeader
        title="Verification queue"
        description="Review society LOP/NOC submissions and dealer DNFBP certificates. Every approve or reject action requires a reason and writes to the audit ledger."
      />
      <VerificationReviewPanel societies={societies} dealers={dealers} />
    </div>
  );
}
