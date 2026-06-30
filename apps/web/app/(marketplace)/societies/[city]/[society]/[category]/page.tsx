import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import {
  Button,
  EmptyState,
  JsonLd,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formatPKR,
} from "@sectoria/ui";
import { getApi } from "@/lib/trpc/server";
import { isNotFound } from "@/lib/fetch";
import { categoryPath, priceToNumber, societyPath } from "@/lib/marketplace";
import {
  breadcrumbSchema,
  pageMetadata,
  realEstateListingSchema,
} from "@/lib/seo";
import { SITE } from "@/lib/site";
import { isLegacySelfServeBookingEnabled } from "@/lib/feature-flags";
import { QuoteRequestForm } from "@/components/marketplace/quote-request-form";
import { LeadSource } from "@sectoria/types";

export const revalidate = 21600;

type Params = Promise<{ city: string; society: string; category: string }>;

type CategoryDetail = Awaited<
  ReturnType<ReturnType<typeof getApi>["inventoryCategory"]["getById"]>
>;
type SocietyWithCategories = Awaited<
  ReturnType<ReturnType<typeof getApi>["society"]["getBySlug"]>
>;

type LoadResult =
  | {
      readonly ok: true;
      readonly society: SocietyWithCategories;
      readonly detail: CategoryDetail;
    }
  | { readonly ok: false; readonly reason: "not_found" | "error" };

const loadCategory = cache(
  async (societySlug: string, categorySlug: string): Promise<LoadResult> => {
    try {
      const api = getApi();
      const society = await api.society.getBySlug({ slug: societySlug });
      const match = society.categories.find((c) => c.slug === categorySlug);
      if (match === undefined) return { ok: false, reason: "not_found" };
      const detail = await api.inventoryCategory.getById({
        categoryId: match.id,
      });
      return { ok: true, society, detail };
    } catch (error) {
      if (isNotFound(error)) return { ok: false, reason: "not_found" };
      if (process.env.NODE_ENV !== "production") {
        console.error("[category] load failed:", error);
      }
      return { ok: false, reason: "error" };
    }
  },
);

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { city, society, category } = await params;
  const result = await loadCategory(society, category);
  if (!result.ok) {
    return { title: "Category not found", robots: { index: false } };
  }
  const total = Math.round(
    priceToNumber(result.detail.pricePerSqft) * result.detail.sizeSqft,
  );
  return pageMetadata({
    title: `${result.detail.sizeLabel} in ${result.society.name}, ${result.society.city}`,
    description: `${result.detail.sizeLabel} ${result.detail.plotType.toLowerCase()} plot (${result.detail.phase}, ${result.detail.block}) in ${result.society.name}, ${result.society.city}. Priced at ${formatPKR(total)} with verified, escrow-protected booking on ${SITE.name}.`,
    path: categoryPath(city, society, category),
  });
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Params;
}) {
  const { city, society: societySlug, category: categorySlug } = await params;
  const result = await loadCategory(societySlug, categorySlug);

  if (!result.ok) {
    if (result.reason === "not_found") notFound();
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6">
        <EmptyState
          heading="This category is temporarily unavailable"
          description="We couldn't load this category right now. Please try again shortly."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href={societyPath(city, societySlug)}>Back to society</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { society, detail } = result;
  const pricePerSqft = priceToNumber(detail.pricePerSqft);
  const totalPrice = Math.round(pricePerSqft * detail.sizeSqft);
  const soldOut = detail.availableUnits <= 0;
  const path = categoryPath(society.citySlug, society.slug, detail.slug);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
      <JsonLd
        schema={[
          realEstateListingSchema({
            name: `${society.name} — ${detail.sizeLabel} (${detail.phase})`,
            path,
            description: `${detail.sizeLabel} ${detail.plotType.toLowerCase()} plot in ${society.name}, ${detail.phase} ${detail.block}.`,
            priceFrom: totalPrice,
            available: !soldOut,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Societies", path: "/societies" },
            { name: society.city, path: `/societies?citySlug=${society.citySlug}` },
            { name: society.name, path: societyPath(society.citySlug, society.slug) },
            { name: detail.sizeLabel, path },
          ]),
        ]}
      />

      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 font-sans text-xs text-text-tertiary">
          <li><Link href="/societies" className="hover:text-text-secondary">Societies</Link></li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={societyPath(society.citySlug, society.slug)}
              className="hover:text-text-secondary"
            >
              {society.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-text-secondary">{detail.sizeLabel}</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* ── Main ─────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-8">
          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge variant="info">
                {detail.plotType === "COMMERCIAL" ? "Commercial" : "Residential"}
              </StatusBadge>
              <StatusBadge
                variant="neutral"
                title={
                  detail.allocationStrategy === "BALLOT"
                    ? "Plots are assigned by a seeded, auditable ballot"
                    : "Plots are assigned first-come, first-served"
                }
              >
                {detail.allocationStrategy === "BALLOT"
                  ? "Ballot allocation"
                  : "FIFO allocation"}
              </StatusBadge>
              {soldOut ? (
                <StatusBadge variant="danger">Sold out</StatusBadge>
              ) : (
                <StatusBadge variant="success">
                  {detail.availableUnits} of {detail.totalUnits} available
                </StatusBadge>
              )}
            </div>
            <h1 className="font-sans text-3xl font-bold text-text-primary">
              {detail.sizeLabel}
            </h1>
            <p className="font-sans text-sm text-text-tertiary">
              {society.name} · {detail.phase} · {detail.block} ·{" "}
              {detail.sizeSqft.toLocaleString("en-PK")} sq ft
            </p>
          </header>

          {/* Payment plans */}
          <section className="flex flex-col gap-4">
            <h2 className="font-sans text-lg font-bold text-text-primary">
              Payment plans
            </h2>
            {detail.paymentPlans.length === 0 ? (
              <EmptyState
                heading="No payment plans published"
                description="This category doesn't have payment plans listed yet. Contact the society for current terms."
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border-base">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Down payment</TableHead>
                      <TableHead>Instalments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.paymentPlans.map((plan) => {
                      const downPct = Number(plan.downPaymentPct);
                      const downAmount = Math.round((totalPrice * downPct) / 100);
                      return (
                        <TableRow key={plan.id}>
                          <TableCell className="font-medium text-text-primary">
                            {plan.label}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">{formatPKR(downAmount)}</span>{" "}
                            <span className="text-text-tertiary">({downPct}%)</span>
                          </TableCell>
                          <TableCell>
                            {plan.installmentCount > 0
                              ? `${plan.installmentCount} × ${plan.installmentInterval}`
                              : "Lump sum"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          {/* Tax clarity note */}
          <div className="flex gap-3 rounded-xl border border-info-border bg-info-bg p-4">
            <Info aria-hidden="true" className="h-5 w-5 shrink-0 text-info-text" />
            <p className="font-sans text-sm text-info-text">
              Your exact federal transfer tax (Section 236C / 236K) depends on
              your FBR filer status. Sectoria calculates it for you — and shows
              the filer-vs-non-filer difference — during booking, before any
              payment.
            </p>
          </div>
        </div>

        {/* ── Sticky booking panel ─────────────────────────────── */}
        <aside className="flex w-full flex-col gap-4 rounded-xl border border-border-base bg-surface-card p-6 shadow-sm lg:sticky lg:top-20 lg:w-80">
          <div className="flex flex-col">
            <span className="font-sans text-xs text-text-tertiary">
              Total price
            </span>
            <span className="font-mono text-2xl font-semibold text-text-primary">
              {formatPKR(totalPrice)}
            </span>
            <span className="font-mono text-xs text-text-tertiary">
              {formatPKR(pricePerSqft)} per sq ft
            </span>
          </div>

          {soldOut ? (
            <Button size="lg" className="w-full" disabled>
              Sold out
            </Button>
          ) : isLegacySelfServeBookingEnabled() ? (
            <Button asChild size="lg" className="w-full">
              <Link href={`/dashboard/booking/${detail.id}`}>
                Start booking
              </Link>
            </Button>
          ) : (
            <QuoteRequestForm
              societyIds={[society.id]}
              categoryId={detail.id}
              source={LeadSource.CATEGORY}
              heading="Get best price"
              description="Our advisor will call you with the best authorized-dealer rate for this category."
            />
          )}
          {!isLegacySelfServeBookingEnabled() ? (
            <p className="font-sans text-xs text-text-tertiary">
              From {formatPKR(totalPrice)} list price. Exact quote provided by
              a Sectoria advisor — no dealer contact on this page.
            </p>
          ) : (
            <p className="font-sans text-xs text-text-tertiary">
              You&apos;ll verify your identity (NADRA), review your exact tax, and
              pay a token into escrow — nothing is charged before you confirm.
            </p>
          )}

          <div className="border-t border-border-base pt-4">
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link href={`/compare?ids=${society.slug}`}>
                Compare with other societies
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
