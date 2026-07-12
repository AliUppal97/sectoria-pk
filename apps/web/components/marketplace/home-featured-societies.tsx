import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button, EmptyState, ErrorState } from "@sectoria/ui";
import { SectionHeading } from "@/components/marketplace/section-heading";
import { SocietyCard } from "@/components/marketplace/society-card";
import { load } from "@/lib/fetch";
import { listFeaturedSocieties } from "@/lib/queries";
import { SITE } from "@/lib/site";

const FEATURED_LIMIT = 6;

/**
 * Featured grid via `society.listFeatured` — HSMS → VERIFIED → price → name.
 * Copy never implies alphabetical or cheapest-first (homepage-ia §2.2).
 */
export async function HomeFeaturedSocieties() {
  const featured = await load(() => listFeaturedSocieties(FEATURED_LIMIT));

  return (
    <section className="border-t border-border-base bg-surface-base">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="Featured"
          title="Verified societies to explore"
          description="A selection of societies on Sectoria, starting with the strongest verification signals."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/societies">View all societies</Link>
            </Button>
          }
        />

        <div className="mt-8">
          {featured.status === "error" ? (
            <ErrorState
              title="We couldn't load societies"
              message="The directory is temporarily unavailable. Please try again in a moment."
              supportHref={SITE.supportPath}
            />
          ) : featured.data.length === 0 ? (
            <EmptyState
              icon={Building2}
              heading="No societies are listed yet"
              description="Verified societies will appear here as they complete onboarding."
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/societies">Browse the directory</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.data.map((society) => (
                <SocietyCard key={society.id} society={society} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
