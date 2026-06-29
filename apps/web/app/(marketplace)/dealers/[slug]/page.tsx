import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase } from "lucide-react";
import {
  Button,
  EmptyState,
  JsonLd,
  ProgressBar,
  StatusBadge,
  TrustBadge,
} from "@sectoria/ui";
import type { TrustScoreResult } from "@sectoria/types";
import type { DealerProfile } from "@sectoria/database";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { TrustScoreGauge } from "@/components/marketplace/trust-score-gauge";
import { getApi } from "@/lib/trpc/server";
import { isNotFound } from "@/lib/fetch";
import { dealerPath } from "@/lib/marketplace";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE, absoluteUrl } from "@/lib/site";

export const revalidate = 21600;

type Params = Promise<{ slug: string }>;

type LoadResult =
  | {
      readonly ok: true;
      readonly dealer: DealerProfile;
      readonly trust: TrustScoreResult | null;
    }
  | { readonly ok: false; readonly reason: "not_found" | "error" };

const loadDealer = cache(async (slug: string): Promise<LoadResult> => {
  try {
    const api = getApi();
    const dealer = await api.dealer.getBySlug({ slug });
    // Trust score is non-fatal: a failure here shouldn't 404 the whole profile.
    let trust: TrustScoreResult | null = null;
    try {
      trust = await api.dealer.trustScore({ dealerId: dealer.id });
    } catch {
      trust = null;
    }
    return { ok: true, dealer, trust };
  } catch (error) {
    if (isNotFound(error)) return { ok: false, reason: "not_found" };
    if (process.env.NODE_ENV !== "production") {
      console.error("[dealer] load failed:", error);
    }
    return { ok: false, reason: "error" };
  }
});

const COMPONENT_LABEL: Record<string, string> = {
  verifiedTransactions: "Verified transactions",
  buyerRating: "Buyer rating",
  responseTime: "Response time",
  verificationCompleteness: "License verification",
  disputeResolution: "Dispute resolution",
};

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadDealer(slug);
  if (!result.ok) {
    return { title: "Dealer not found", robots: { index: false } };
  }
  const verified = result.dealer.dnfbpVerified
    ? "DNFBP-verified"
    : "DNFBP pending";
  return pageMetadata({
    title: `${result.dealer.agencyName} — verified dealer`,
    description: `${result.dealer.agencyName} on ${SITE.name}: ${verified}, ${result.dealer.completedDeals} completed deals${result.trust ? `, trust score ${result.trust.score}/100` : ""}.`,
    path: dealerPath(slug),
  });
}

export default async function DealerProfilePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const result = await loadDealer(slug);

  if (!result.ok) {
    if (result.reason === "not_found") notFound();
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6">
        <EmptyState
          heading="This dealer is temporarily unavailable"
          description="We couldn't load this profile right now. Please try again shortly."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/dealers">Back to dealers</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { dealer, trust } = result;

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
      <JsonLd
        schema={[
          {
            "@type": "RealEstateAgent",
            name: dealer.agencyName,
            url: absoluteUrl(dealerPath(dealer.slug)),
            areaServed: "PK",
          },
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Dealers", path: "/dealers" },
            { name: dealer.agencyName, path: dealerPath(dealer.slug) },
          ]),
        ]}
      />

      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 font-sans text-xs text-text-tertiary">
          <li><Link href="/dealers" className="hover:text-text-secondary">Dealers</Link></li>
          <li aria-hidden="true">/</li>
          <li className="text-text-secondary">{dealer.agencyName}</li>
        </ol>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle">
            <Briefcase aria-hidden="true" className="h-6 w-6 text-text-secondary" />
          </span>
          <h1 className="font-sans text-3xl font-bold text-text-primary">
            {dealer.agencyName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {dealer.dnfbpVerified ? (
            <TrustBadge variant="dnfbp" />
          ) : (
            <StatusBadge
              variant="warning"
              title="This dealer's DNFBP AML/CFT registration has not been verified yet."
            >
              DNFBP pending
            </StatusBadge>
          )}
          {dealer.dnfbpCertNumber ? (
            <StatusBadge variant="neutral" title="DNFBP certificate number">
              {dealer.dnfbpCertNumber}
            </StatusBadge>
          ) : null}
        </div>
      </header>

      <BentoGrid className="mt-8">
        <BentoCell size="wide" className="flex items-center gap-6">
          {trust ? (
            <>
              <TrustScoreGauge score={trust.score} />
              <div className="flex flex-col gap-1">
                <h2 className="font-sans text-lg font-bold text-text-primary">
                  Trust score
                </h2>
                <p className="max-w-md font-sans text-sm text-text-secondary">
                  Weighted heavily toward PLRA-verified completed transactions,
                  so it can&apos;t be gamed by engagement alone.
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <h2 className="font-sans text-lg font-bold text-text-primary">
                Trust score
              </h2>
              <p className="font-sans text-sm text-text-tertiary">
                Trust score is being calculated and will appear shortly.
              </p>
            </div>
          )}
        </BentoCell>

        <BentoCell className="flex flex-col gap-1">
          <h2 className="font-sans text-md font-semibold text-text-primary">
            Completed deals
          </h2>
          <p className="font-mono text-2xl font-semibold text-text-primary">
            {dealer.completedDeals}
          </p>
          <p className="font-sans text-sm text-text-tertiary">
            verified transfers attributed to this dealer
          </p>
        </BentoCell>

        {trust ? (
          <BentoCell size="wide" className="flex flex-col gap-4">
            <h2 className="font-sans text-md font-semibold text-text-primary">
              How this score is calculated
            </h2>
            <ul className="flex flex-col gap-3">
              {trust.breakdown.map((component) => (
                <li key={component.component} className="flex flex-col gap-1">
                  <ProgressBar
                    value={component.normalizedValue * 100}
                    label={`${COMPONENT_LABEL[component.component] ?? component.component} · ${component.weight}% weight`}
                    showValue
                  />
                </li>
              ))}
            </ul>
          </BentoCell>
        ) : null}
      </BentoGrid>
    </div>
  );
}
