import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  Fingerprint,
  Lock,
  Receipt,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Button, EmptyState, ErrorState, JsonLd } from "@sectoria/ui";
import { BackgroundGrid } from "@/components/marketplace/background-grid";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { SectionHeading } from "@/components/marketplace/section-heading";
import { SocietyCard } from "@/components/marketplace/society-card";
import { load } from "@/lib/fetch";
import { listSocietySummaries } from "@/lib/queries";
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

const FEATURED_LIMIT = 6;

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

const FEATURES = [
  {
    icon: Fingerprint,
    title: "NADRA & FBR verified",
    body: "Every buyer is identity-checked against NADRA and tax status confirmed against the FBR Active Taxpayer List before a booking completes.",
  },
  {
    icon: Lock,
    title: "Escrow on every booking",
    body: "Your token and instalments are held in escrow and only released as the transfer reaches each verified milestone.",
  },
  {
    icon: Scale,
    title: "Compare like-for-like",
    body: "Put societies side by side on price, approvals, development stage and buyer ratings — no guesswork, no sales pressure.",
  },
  {
    icon: Receipt,
    title: "Tax made clear",
    body: "See your exact 236C / 236K liability for your filer status before you commit — the number no other platform shows you upfront.",
  },
] as const;

export default async function HomePage() {
  const featured = await load(() => listSocietySummaries());

  return (
    <div className="flex flex-col">
      <JsonLd
        schema={[
          organizationSchema(),
          webSiteSchema(),
          breadcrumbSchema([{ name: "Home", path: "/" }]),
        ]}
      />

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border-base bg-surface-base">
        <BackgroundGrid />
        <div className="relative mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-16 sm:px-6 sm:py-24">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-success-border bg-success-bg px-3 py-1 font-sans text-2xs font-semibold text-success-text">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
            Verified before it&apos;s listed
          </span>
          <h1 className="max-w-3xl font-sans text-4xl font-bold leading-[1.1] tracking-tight text-text-primary sm:text-5xl">
            Buy property in Pakistan&apos;s housing societies — without the
            uncertainty.
          </h1>
          <p className="max-w-2xl font-sans text-md text-text-secondary">
            {SITE.description}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/societies">Explore societies</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/compare">Compare side by side</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Feature bento ──────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="Why Sectoria"
          title="Trust, built into every step"
          description="A marketplace designed for the buyer handing over millions of rupees remotely — every signal verifiable, nothing hidden."
        />
        <BentoGrid className="mt-8">
          <BentoCell size="anchor" tone="navy" className="flex flex-col justify-between gap-6">
            <ShieldCheck
              aria-hidden="true"
              className="h-10 w-10 text-brand-accent"
              strokeWidth={2}
            />
            <div className="flex flex-col gap-2">
              <h3 className="font-sans text-2xl font-bold text-text-inverse">
                Listings are checked, not just claimed
              </h3>
              <p className="font-sans text-sm text-text-inverse/70">
                We confirm a society&apos;s layout (LOP) and no-objection (NOC)
                approvals with its development authority — and surface the live
                HSMS link where one exists — before it ever appears here.
              </p>
            </div>
            <Button asChild variant="success" className="w-fit">
              <Link href="/societies?verificationTier=HSMS_LINKED">
                See HSMS-linked societies
              </Link>
            </Button>
          </BentoCell>

          {FEATURES.map((feature) => (
            <BentoCell key={feature.title} className="flex flex-col gap-3">
              <feature.icon
                aria-hidden="true"
                className="h-7 w-7 text-text-accent"
                strokeWidth={2}
              />
              <h3 className="font-sans text-lg font-bold text-text-primary">
                {feature.title}
              </h3>
              <p className="font-sans text-sm text-text-secondary">
                {feature.body}
              </p>
            </BentoCell>
          ))}
        </BentoGrid>
      </section>

      {/* ── Featured societies ─────────────────────────────────── */}
      <section className="border-t border-border-base bg-surface-base">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6">
          <SectionHeading
            eyebrow="Featured"
            title="Verified societies to explore"
            description="A selection of societies on Sectoria, ordered alphabetically."
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
                {featured.data.slice(0, FEATURED_LIMIT).map((society) => (
                  <SocietyCard key={society.id} society={society} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
