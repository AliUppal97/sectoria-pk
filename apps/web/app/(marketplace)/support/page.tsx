import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import { Button } from "@sectoria/ui";
import { SectionHeading } from "@/components/marketplace/section-heading";
import { QuoteRequestForm } from "@/components/marketplace/quote-request-form";
import { LeadSource } from "@sectoria/types";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Contact Sectoria — get the best price",
  description:
    "Request a callback from Sectoria advisors for the best authorized-dealer price on verified housing societies.",
  path: "/support",
});

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="Support"
        title="Talk to a Sectoria advisor"
        description="Compare societies on your own, then let us negotiate the best price with authorized dealers — your details stay with Sectoria."
      />

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Button asChild variant="ghost" className="min-h-[44px]">
          <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
        </Button>
        <Button asChild variant="ghost" className="min-h-[44px]">
          <Link href="/societies">
            <Phone className="mr-2 h-4 w-4" aria-hidden="true" />
            Browse societies first
          </Link>
        </Button>
      </div>

      <div className="mt-10">
        <QuoteRequestForm
          societyIds={[]}
          source={LeadSource.SUPPORT}
          heading="Request a callback"
          description="Share your phone number and which societies interest you. We'll call back with pricing options."
        />
      </div>
    </div>
  );
}
