import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { BackgroundGrid } from "@/components/marketplace/background-grid";
import { SocietyDiscoveryBar } from "@/components/marketplace/society-discovery-bar";
import { load } from "@/lib/fetch";
import { listSocietyFacets } from "@/lib/queries";
import {
  EMPTY_DISCOVERY_FACETS,
  type SocietyDiscoveryFacets,
} from "@/lib/society-discovery-ui";

const CITY_CHIP_LIMIT = 6;

/**
 * Homepage first viewport: trust line, H1, supporting sentence, slim
 * DiscoveryBar (`mode=home`), and city chips (homepage-ia §2 / foundations §5).
 */
export async function HomeHero() {
  const facetsResult = await load(() => listSocietyFacets());
  const facets: SocietyDiscoveryFacets =
    facetsResult.status === "success"
      ? facetsResult.data
      : EMPTY_DISCOVERY_FACETS;

  const cityChips = [...facets.cities]
    .filter((city) => city.count > 0)
    .sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    )
    .slice(0, CITY_CHIP_LIMIT);

  return (
    // No overflow-hidden: typeahead listbox is absolute and must paint over
    // the trust strip below (overflow would clip it).
    <section className="relative border-b border-border-base bg-surface-base">
      <BackgroundGrid />
      <div className="relative z-10 mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-16 sm:px-6 sm:py-24">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-success-border bg-success-bg px-3 py-1 font-sans text-2xs font-semibold text-success-text">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
          Verified before it&apos;s listed
        </span>
        <h1 className="max-w-3xl font-sans text-4xl font-bold leading-[1.1] tracking-tight text-text-primary sm:text-5xl">
          Buy property in Pakistan&apos;s housing societies — without the
          uncertainty.
        </h1>
        <p className="max-w-2xl font-sans text-md text-text-secondary">
          Search verified societies, then get an advisor-negotiated price —
          without dealing with dealers on the public site.
        </p>

        <SocietyDiscoveryBar
          mode="home"
          facets={facets}
          facetsError={facetsResult.status === "error"}
          current={{}}
        />

        {cityChips.length > 0 ? (
          <ul
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
            aria-label="Browse by city"
          >
            {cityChips.map((city) => (
              <li key={city.slug} className="shrink-0">
                <Link
                  href={`/societies?citySlug=${encodeURIComponent(city.slug)}`}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border-base bg-surface-card px-3 py-2 font-sans text-sm text-text-primary transition-colors duration-150 ease-default hover:border-brand-navy hover:bg-surface-subtle active:bg-surface-subtle motion-reduce:transition-none"
                  aria-label={`Societies in ${city.label}`}
                >
                  <span>{city.label}</span>
                  <span className="font-mono text-xs text-text-tertiary">
                    {city.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
