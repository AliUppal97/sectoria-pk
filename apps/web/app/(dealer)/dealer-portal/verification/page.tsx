import type { Metadata } from "next";
import { PageHeader } from "@/components/buyer/page-header";
import { DnfbpVerificationForm } from "@/components/dealer/dnfbp-verification-form";
import { getAuthedApi } from "@/lib/trpc/server";

export const metadata: Metadata = {
  title: "DNFBP verification",
  robots: { index: false, follow: false },
};

export default async function DealerVerificationPage() {
  const api = await getAuthedApi();
  const profile = await api.dealer.getMyProfile();

  return (
    <div>
      <PageHeader
        title="DNFBP certificate verification"
        description="Submit your Designated Non-Financial Business or Profession registration for a spot-check against the AML/CFT registry. Verified dealers appear in the public directory with a trust badge."
      />
      <div className="rounded-xl border border-border-base bg-surface-card p-6 shadow-xs">
        <DnfbpVerificationForm
          initialCertNumber={profile.dnfbpCertNumber}
          initialVerified={profile.dnfbpVerified}
        />
      </div>
    </div>
  );
}
