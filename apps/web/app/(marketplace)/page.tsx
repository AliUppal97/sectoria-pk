import type { Metadata } from "next";
import { JsonLd } from "@sectoria/ui";
import { HomeFeaturedSocieties } from "@/components/marketplace/home-featured-societies";
import { HomeHero } from "@/components/marketplace/home-hero";
import { HomeNextStepBand } from "@/components/marketplace/home-next-step-band";
import { HomeTrustStrip } from "@/components/marketplace/home-trust-strip";
import { HomeWhyBento } from "@/components/marketplace/home-why-bento";
import {
  breadcrumbSchema,
  organizationSchema,
  pageMetadata,
  webSiteSchema,
} from "@/lib/seo";
import { SITE } from "@/lib/site";

// Homepage content is largely stable; revalidate periodically rather than on
// every request so it stays fast (Core Web Vitals) without going stale.
export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    path: "/",
    keywords: [
      "verified housing societies Pakistan",
      "compare housing societies",
      "buy plot Pakistan",
      "escrow property booking",
    ],
  });
}

/**
 * Search-first marketplace home (ADR-010 / homepage-ia D2). Thin composition
 * root — sections live in `components/marketplace/home-*`.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col">
      <JsonLd
        schema={[
          organizationSchema(),
          webSiteSchema(),
          breadcrumbSchema([{ name: "Home", path: "/" }]),
        ]}
      />

      <HomeHero />
      <HomeTrustStrip />
      <HomeFeaturedSocieties />
      <HomeWhyBento />
      <HomeNextStepBand />
    </div>
  );
}
