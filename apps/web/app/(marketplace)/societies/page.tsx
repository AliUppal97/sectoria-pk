import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button, EmptyState, ErrorState, JsonLd } from "@sectoria/ui";
import { SectionHeading } from "@/components/marketplace/section-heading";
import { SocietyCard } from "@/components/marketplace/society-card";
import { SocietyFilters } from "@/components/marketplace/society-filters";
import { load } from "@/lib/fetch";
import {
  listAuthorityFacets,
  listCityFacets,
  listSocietySummaries,
} from "@/lib/queries";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import {
  parseSocietyDiscoveryParams,
  serializeSocietyDiscoveryParams,
} from "@/lib/society-discovery-params";

// SSR: filters are URL search params so filtered views are crawlable/shareable
// (seo.mdc). Accessing searchParams opts this route into dynamic rendering.
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const filters = parseSocietyDiscoveryParams(params);
  const cities = await load(() => listCityFacets());
  const cityLabel =
    cities.status === "success" && filters.citySlug
      ? cities.data.find((c) => c.slug === filters.citySlug)?.label
      : undefined;

  const scope = cityLabel ? ` in ${cityLabel}` : " in Pakistan";
  const title = `Verified housing societies${scope}`;
  const query = serializeSocietyDiscoveryParams({
    citySlug: filters.citySlug,
    authority: filters.authority,
    verificationTier: filters.verificationTier,
    // Keep search out of the canonical path for now — H5 extends metadata
    // descriptions when search is present without stuffing keywords.
    search: undefined,
  });
  const path =
    query.size > 0 ? `/societies?${query.toString()}` : "/societies";

  return pageMetadata({
    title,
    description: `Browse and filter verified housing societies${scope} by city, development authority and verification status. Compare pricing, approvals and buyer ratings on ${SITE.name}.`,
    path,
  });
}

export default async function SocietiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filters = parseSocietyDiscoveryParams(params);

  const [societies, cities, authorities] = await Promise.all([
    load(() => listSocietySummaries(filters)),
    load(() => listCityFacets()),
    load(() => listAuthorityFacets()),
  ]);

  const hasFilters =
    Boolean(filters.citySlug) ||
    Boolean(filters.authority) ||
    Boolean(filters.verificationTier) ||
    Boolean(filters.search);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Societies", path: "/societies" },
        ])}
      />

      <SectionHeading
        eyebrow="Directory"
        title="Housing societies"
        description="Search by name or city, then filter by authority and verification status. Filtered views are shareable — the filters live in the URL."
      />

      <div className="mt-8 flex flex-col gap-8">
        <SocietyFilters
          cities={cities.status === "success" ? cities.data : []}
          authorities={authorities.status === "success" ? authorities.data : []}
          current={{
            search: filters.search,
            citySlug: filters.citySlug,
            verificationTier: filters.verificationTier,
            authority: filters.authority,
          }}
        />

        {societies.status === "error" ? (
          <ErrorState
            title="We couldn't load the directory"
            message="Something went wrong fetching societies. Please try again shortly."
            supportHref={SITE.supportPath}
          />
        ) : societies.data.length === 0 ? (
          <EmptyState
            icon={Building2}
            heading={
              hasFilters
                ? "No societies match these filters"
                : "No societies are listed yet"
            }
            description={
              hasFilters
                ? "Try widening your filters — a different city, authority, or verification level."
                : "Verified societies will appear here as they complete onboarding."
            }
            action={
              hasFilters ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/societies">Reset filters</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div>
            <p className="mb-4 font-sans text-sm text-text-tertiary" aria-live="polite">
              {societies.data.length}{" "}
              {societies.data.length === 1 ? "society" : "societies"}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {societies.data.map((society) => (
                <SocietyCard key={society.id} society={society} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
