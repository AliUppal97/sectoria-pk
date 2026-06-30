import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Button } from "@sectoria/ui";
import { PageHeader } from "@/components/buyer/page-header";
import { TrustScoreBreakdown } from "@/components/dealer/trust-score-breakdown";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "Trust score",
  robots: { index: false, follow: false },
};

export default async function DealerTrustScorePage() {
  const api = await getAuthedApi();
  const trustScore = await api.dealer.getMyTrustScore();

  return (
    <div>
      <PageHeader
        title="Trust score breakdown"
        description="How your score is calculated from verified transactions, buyer ratings, response time, license verification, and dispute history."
      />

      {trustScore ? (
        <div className="rounded-xl border border-border-base bg-surface-card p-6 shadow-xs">
          <TrustScoreBreakdown trustScore={trustScore} />
        </div>
      ) : (
        <EmptyState
          heading="Trust score unavailable"
          description="We couldn't compute your trust score right now. Complete DNFBP verification and closed deals to build your score."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/dealer-portal/verification">
                Complete DNFBP verification
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
