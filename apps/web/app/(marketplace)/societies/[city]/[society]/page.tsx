import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, MapPin } from "lucide-react";
import {
  Button,
  EmptyState,
  JsonLd,
  ProgressBar,
  StatusBadge,
  TrustBadge,
  formatDate,
  formatPKR,
} from "@sectoria/ui";
import { formatLandKanal, parseKanalString } from "@sectoria/domain-land";
import { geoJsonBoundarySchema } from "@sectoria/types";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { CategoryCard, type CategoryView } from "@/components/marketplace/category-card";
import { RatingStars } from "@/components/marketplace/rating-stars";
import { SectionHeading } from "@/components/marketplace/section-heading";
import { SocietyBookingBanner } from "@/components/marketplace/society-booking-banner";
import { SocietyLocationSection } from "@/components/marketplace/society-location-section";
import { SocietyPaymentPlans } from "@/components/marketplace/society-payment-plans";
import { SocietyUpdatesTimeline } from "@/components/marketplace/society-updates-timeline";
import { VerificationTierBadge } from "@/components/marketplace/verification-badge";
import { getApi } from "@/lib/trpc/server";
import { isNotFound } from "@/lib/fetch";
import {
  VERIFICATION_TIER_META,
  priceToNumber,
  societyPath,
} from "@/lib/marketplace";
import {
  aggregateRatingSchema,
  breadcrumbSchema,
  pageMetadata,
  placeSchema,
  realEstateListingSchema,
  societyOrganizationSchema,
} from "@/lib/seo";
import { SITE } from "@/lib/site";

// ISR: society content is largely stable (inventory counts drift slowly), so
// regenerate at most every 6 hours rather than on every request (seo.mdc).
export const revalidate = 21600;

type Params = Promise<{ city: string; society: string }>;

type LoadResult =
  | { readonly ok: true; readonly society: SocietyWithCategories }
  | { readonly ok: false; readonly reason: "not_found" | "error" };

type SocietyWithCategories = Awaited<
  ReturnType<ReturnType<typeof getApi>["society"]["getBySlug"]>
>;

/**
 * Loads a society by slug once per request (React `cache` dedupes the call
 * shared by `generateMetadata` and the page). NOT_FOUND and transport errors
 * become typed results so each caller can respond appropriately.
 */
const loadSociety = cache(async (slug: string): Promise<LoadResult> => {
  try {
    return { ok: true, society: await getApi().society.getBySlug({ slug }) };
  } catch (error) {
    if (isNotFound(error)) return { ok: false, reason: "not_found" };
    if (process.env.NODE_ENV !== "production") {
      console.error("[society] load failed:", error);
    }
    return { ok: false, reason: "error" };
  }
});

const loadReviews = cache(async (societyId: string) => {
  try {
    return await getApi().review.listForSociety({ societyId });
  } catch {
    return [];
  }
});

function toCategoryView(category: {
  id: string;
  slug: string;
  phase: string;
  block: string;
  plotType: "RESIDENTIAL" | "COMMERCIAL";
  sizeLabel: string;
  sizeSqft: number;
  pricePerSqft: string | number;
  totalUnits: number;
  availableUnits: number;
  allocationStrategy: "FIFO" | "BALLOT";
}): CategoryView {
  const pricePerSqft = priceToNumber(category.pricePerSqft);
  return {
    id: category.id,
    slug: category.slug,
    phase: category.phase,
    block: category.block,
    plotType: category.plotType,
    sizeLabel: category.sizeLabel,
    sizeSqft: category.sizeSqft,
    pricePerSqft,
    totalPrice: Math.round(pricePerSqft * category.sizeSqft),
    totalUnits: category.totalUnits,
    availableUnits: category.availableUnits,
    allocationStrategy: category.allocationStrategy,
  };
}

function sortCategories(categories: CategoryView[]): CategoryView[] {
  return [...categories].sort(
    (a, b) => a.phase.localeCompare(b.phase) || a.sizeSqft - b.sizeSqft,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { city, society: societySlug } = await params;
  const result = await loadSociety(societySlug);
  if (!result.ok) {
    return { title: "Society not found", robots: { index: false } };
  }
  const { society } = result;
  const categories = society.categories.map(toCategoryView);
  const from = categories.length
    ? Math.min(...categories.map((c) => c.totalPrice))
    : null;
  const landSummary =
    society.totalLandKanal !== null && society.totalLandKanal !== undefined
      ? formatLandKanal(parseKanalString(society.totalLandKanal) ?? 0)
      : null;
  const bookingNote =
    society.bookingStatus === "OPEN"
      ? "Booking open."
      : society.bookingStatus === "CLOSED"
        ? "Booking closed."
        : "Booking opening soon.";

  return pageMetadata({
    title: `${society.name}, ${society.city}`,
    description: `${society.name} in ${society.city} — ${VERIFICATION_TIER_META[society.verificationTier].label}, approved by ${society.authority}.${landSummary !== null ? ` ${landSummary}.` : ""} ${bookingNote}${from !== null ? ` Plots from ${formatPKR(from)}.` : ""} Compare pricing, payment plans and availability on ${SITE.name}.`,
    path: societyPath(city, societySlug),
  });
}

export default async function SocietyProfilePage({
  params,
}: {
  params: Params;
}) {
  const { city, society: societySlug } = await params;
  const result = await loadSociety(societySlug);

  if (!result.ok) {
    if (result.reason === "not_found") notFound();
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6">
        <EmptyState
          heading="This society is temporarily unavailable"
          description="We couldn't load this profile right now. Please try again shortly."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/societies">Back to directory</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { society } = result;

  // Keep the canonical URL honest: if the city segment doesn't match the
  // society's real city slug, redirect to the correct path (preserves SEO).
  if (society.citySlug !== city) {
    redirect(societyPath(society.citySlug, society.slug));
  }

  const categories = sortCategories(society.categories.map(toCategoryView));
  const reviews = await loadReviews(society.id);
  const ratingCount = reviews.length;
  const ratingValue =
    ratingCount > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount
      : null;
  const startingFrom = categories.length
    ? Math.min(...categories.map((c) => c.totalPrice))
    : null;
  const tierMeta = VERIFICATION_TIER_META[society.verificationTier];
  const path = societyPath(society.citySlug, society.slug);
  const totalLandKanal =
    society.totalLandKanal !== null && society.totalLandKanal !== undefined
      ? formatLandKanal(parseKanalString(society.totalLandKanal) ?? 0)
      : null;

  return (
    <div className="flex flex-col">
      <JsonLd
        schema={[
          {
            ...societyOrganizationSchema({
              name: society.name,
              city: society.city,
              authority: society.authority,
              path,
              description: society.description,
            }),
            ...(ratingValue !== null
              ? {
                  aggregateRating: aggregateRatingSchema({
                    ratingValue,
                    reviewCount: ratingCount,
                  }),
                }
              : {}),
          },
          ...(society.latitude !== null &&
          society.latitude !== undefined &&
          society.longitude !== null &&
          society.longitude !== undefined
            ? [
                placeSchema({
                  name: society.name,
                  path,
                  latitude: society.latitude,
                  longitude: society.longitude,
                  address: [
                    society.addressLine,
                    society.district,
                    society.city,
                    "Pakistan",
                  ]
                    .filter(Boolean)
                    .join(", "),
                }),
              ]
            : []),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Societies", path: "/societies" },
            { name: society.city, path: `/societies?citySlug=${society.citySlug}` },
            { name: society.name, path },
          ]),
          ...categories.map((category) =>
            realEstateListingSchema({
              name: `${society.name} — ${category.sizeLabel} (${category.phase})`,
              path: `${path}/${category.slug}`,
              description: `${category.sizeLabel} ${category.plotType.toLowerCase()} plot in ${society.name}, ${category.phase} ${category.block}.`,
              priceFrom: category.totalPrice,
              available: category.availableUnits > 0,
            }),
          ),
        ]}
      />

      <SocietyBookingBanner
        status={society.bookingStatus}
        bookingOpensAt={society.bookingOpensAt ?? null}
        bookingClosesAt={society.bookingClosesAt ?? null}
      />

      {/* ── Header ─────────────────────────────────────────────── */}
      <section className="border-b border-border-base bg-surface-card">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 font-sans text-xs text-text-tertiary">
              <li><Link href="/" className="hover:text-text-secondary">Home</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/societies" className="hover:text-text-secondary">Societies</Link></li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/societies?citySlug=${society.citySlug}`}
                  className="hover:text-text-secondary"
                >
                  {society.city}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-text-secondary">{society.name}</li>
            </ol>
          </nav>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <VerificationTierBadge tier={society.verificationTier} />
                <StatusBadge variant="neutral" title={`Approved by the ${society.authority}`}>
                  {society.authority}
                </StatusBadge>
              </div>
              <h1 className="font-sans text-3xl font-bold leading-tight text-text-primary">
                {society.name}
              </h1>
              <p className="flex items-center gap-1.5 font-sans text-sm text-text-tertiary">
                <MapPin aria-hidden="true" className="h-4 w-4" />
                {society.city}, Pakistan
              </p>
              {ratingValue !== null ? (
                <RatingStars rating={ratingValue} count={ratingCount} />
              ) : null}
            </div>

            <div className="flex w-full flex-col gap-3 rounded-xl border border-border-base bg-surface-base p-5 lg:w-72">
              <div className="flex flex-col">
                <span className="font-sans text-xs text-text-tertiary">
                  {startingFrom !== null ? "Plots starting from" : "Pricing"}
                </span>
                <span className="font-mono text-xl font-semibold text-text-primary">
                  {startingFrom !== null ? formatPKR(startingFrom) : "On request"}
                </span>
              </div>
              <Button asChild className="w-full">
                <Link href="#inventory">View inventory</Link>
              </Button>
              {society.latitude !== null && society.longitude !== null ? (
                <Button asChild variant="ghost" className="w-full">
                  <Link href="#location">View on map</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" className="w-full">
                <Link href={`/compare?ids=${society.slug}`}>Add to compare</Link>
              </Button>
              <StatusBadge
                variant={
                  society.bookingStatus === "OPEN"
                    ? "success"
                    : society.bookingStatus === "CLOSED"
                      ? "danger"
                      : "warning"
                }
              >
                {society.bookingStatus === "OPEN"
                  ? "Booking open"
                  : society.bookingStatus === "CLOSED"
                    ? "Booking closed"
                    : "Booking upcoming"}
              </StatusBadge>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust + overview bento ─────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <BentoGrid>
          <BentoCell size="wide" className="flex flex-col gap-4">
            <h2 className="font-sans text-lg font-bold text-text-primary">
              Verification & trust
            </h2>
            <div className="flex flex-wrap gap-2">
              <span title={tierMeta.explanation}>
                <TrustBadge variant="plra" label={tierMeta.label} />
              </span>
              <TrustBadge variant="escrow" />
            </div>
            <p className="font-sans text-sm text-text-secondary">
              {tierMeta.explanation} Every booking on this society is held in
              escrow until the transfer reaches its verified milestones.
            </p>
            <dl className="grid grid-cols-2 gap-3 font-sans text-sm">
              <div className="flex flex-col">
                <dt className="text-xs text-text-tertiary">LOP reference</dt>
                <dd className="font-mono text-text-primary">
                  {society.lopReferenceNo ?? "—"}
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-xs text-text-tertiary">NOC reference</dt>
                <dd className="font-mono text-text-primary">
                  {society.nocReferenceNo ?? "—"}
                </dd>
              </div>
            </dl>
          </BentoCell>

          <BentoCell className="flex flex-col gap-3">
            <h2 className="font-sans text-md font-semibold text-text-primary">
              Development
            </h2>
            <ProgressBar
              value={society.developmentPct}
              label={society.developmentStage}
              showValue
            />
          </BentoCell>

          <BentoCell className="flex flex-col gap-3">
            <h2 className="font-sans text-md font-semibold text-text-primary">
              Inventory
            </h2>
            <p className="font-mono text-2xl font-semibold text-text-primary">
              {categories.length}
            </p>
            <p className="font-sans text-sm text-text-tertiary">
              category {categories.length === 1 ? "type" : "types"} listed
            </p>
            {totalLandKanal !== null ? (
              <p className="font-sans text-sm text-text-secondary">
                Total land: {totalLandKanal}
              </p>
            ) : null}
          </BentoCell>

          {society.amenities.length > 0 ? (
            <BentoCell size="wide" className="flex flex-col gap-3">
              <h2 className="font-sans text-md font-semibold text-text-primary">
                Amenities
              </h2>
              <ul className="flex flex-wrap gap-2">
                {society.amenities.map((amenity) => (
                  <li
                    key={amenity}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1 font-sans text-xs text-text-secondary"
                  >
                    <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-success" />
                    {amenity}
                  </li>
                ))}
              </ul>
            </BentoCell>
          ) : null}

          <BentoCell size="wide" className="flex flex-col gap-2">
            <h2 className="font-sans text-md font-semibold text-text-primary">
              About {society.name}
            </h2>
            <p className="font-sans text-sm leading-relaxed text-text-secondary">
              {society.description}
            </p>
          </BentoCell>
        </BentoGrid>
      </section>

      <SocietyLocationSection
        societyName={society.name}
        city={society.city}
        addressLine={society.addressLine ?? null}
        district={society.district ?? null}
        latitude={society.latitude ?? null}
        longitude={society.longitude ?? null}
        totalLandKanal={society.totalLandKanal ?? null}
        developedLandKanal={society.developedLandKanal ?? null}
        boundaryGeoJson={
          society.boundaryGeoJson !== null &&
          society.boundaryGeoJson !== undefined
            ? geoJsonBoundarySchema.parse(society.boundaryGeoJson)
            : null
        }
      />

      <section className="border-t border-border-base bg-surface-base">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
          <SectionHeading
            eyebrow="Payment plans"
            title="Plans by category"
            description="Each category — phase, block and plot size — has its own payment options. Tap a category for full instalment breakdown."
          />
          <div className="mt-8">
            <SocietyPaymentPlans
              citySlug={society.citySlug}
              societySlug={society.slug}
              categories={
                society.categories as unknown as Parameters<
                  typeof SocietyPaymentPlans
                >[0]["categories"]
              }
            />
          </div>
        </div>
      </section>

      {/* ── Inventory ──────────────────────────────────────────── */}
      <section
        id="inventory"
        className="scroll-mt-20 border-t border-border-base bg-surface-base"
      >
        <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
          <SectionHeading
            eyebrow="Inventory"
            title="Categories & pricing"
            description="Each category is a sellable bucket — phase, block and plot size — with its own pricing, availability and booking flow."
          />
          <div className="mt-8">
            {categories.length === 0 ? (
              <EmptyState
                heading="No inventory listed yet"
                description="This society hasn't published any categories for sale. Check back soon or explore other societies."
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/societies">Browse other societies</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    citySlug={society.citySlug}
                    societySlug={society.slug}
                    category={category}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-border-base">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
          <SectionHeading
            eyebrow="Updates"
            title="Society news & milestones"
            description="Official updates on NOC approvals, licenses, possession, and booking windows — published by the society."
          />
          <div className="mt-8">
            <SocietyUpdatesTimeline updates={society.updates} />
          </div>
        </div>
      </section>

      {/* ── Reviews ────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1280px] px-4 py-12 sm:px-6">
        <SectionHeading
          eyebrow="Reviews"
          title="What buyers say"
          description="Reviews come only from buyers with a completed booking on this society — no anonymous ratings."
        />
        <div className="mt-8">
          {reviews.length === 0 ? (
            <EmptyState
              heading="No reviews yet"
              description="Once buyers complete a booking here, their verified reviews will appear."
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="flex flex-col gap-2 rounded-xl border border-border-base bg-surface-card p-5"
                >
                  <RatingStars rating={review.rating} count={1} />
                  {review.comment ? (
                    <p className="font-sans text-sm text-text-secondary">
                      {review.comment}
                    </p>
                  ) : null}
                  <span className="font-sans text-xs text-text-tertiary">
                    {formatDate(review.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
