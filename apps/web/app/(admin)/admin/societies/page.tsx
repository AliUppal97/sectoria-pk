import type { Metadata } from "next";
import { PageHeader } from "@/components/buyer/page-header";
import { SocietyConsole } from "@/components/admin/society-console";

export const metadata: Metadata = {
  title: "Societies",
  robots: { index: false, follow: false },
};

/**
 * Society onboarding console (M0.3). Ops create societies as DRAFT, track
 * profile completeness, and publish/unpublish/archive once ready. Every read
 * here is the ops-only `society.listForAdmin` (all publish statuses) — the
 * public directory only ever shows PUBLISHED. The interactive table is a client
 * component so search, filters, cursor paging, and mutations stay responsive.
 */
export default function AdminSocietiesPage() {
  return (
    <div>
      <PageHeader
        title="Societies"
        description="Onboard societies as drafts, complete their profiles, and publish them to the marketplace. Publishing is blocked until the required fields are complete."
      />
      <SocietyConsole />
    </div>
  );
}
