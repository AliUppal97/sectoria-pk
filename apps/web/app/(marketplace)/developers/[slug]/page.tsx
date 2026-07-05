import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ExternalLink, MapPin } from "lucide-react";
import { Button, EmptyState, JsonLd } from "@sectoria/ui";
import { LeadSource } from "@sectoria/types";
import { BentoCell, BentoGrid } from "@/components/marketplace/bento";
import { QuoteRequestForm } from "@/components/marketplace/quote-request-form";
import { SectionHeading } from "@/components/marketplace/section-heading";
import { VerificationTierBadge } from "@/components/marketplace/verification-badge";
import { getApi } from "@/lib/trpc/server";
import { isNotFound } from "@/lib/fetch";
import {
  resolveDeveloperAssetUrl,
  type DeveloperProjectPublic,
  type DeveloperSocietyPublic,
} from "@/lib/developer";
import { developerPath, societyPath } from "@/lib/marketplace";
import { breadcrumbSchema, developerOrganizationSchema, pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import type { VerificationTier } from "@sectoria/types";

export const revalidate = 21600;

export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

type DeveloperProfile = Awaited<
  ReturnType<ReturnType<typeof getApi>["developer"]["getBySlug"]>
>;

type LoadResult =
  | { readonly ok: true; readonly developer: DeveloperProfile }
  | { readonly ok: false; readonly reason: "not_found" | "error" };

const loadDeveloper = cache(async (slug: string): Promise<LoadResult> => {
  try {
    return {
      ok: true,
      developer: await getApi().developer.getBySlug({ slug }),
    };
  } catch (error) {
    if (isNotFound(error)) return { ok: false, reason: "not_found" };
    if (process.env.NODE_ENV !== "production") {
      console.error("[developer] load failed:", error);
    }
    return { ok: false, reason: "error" };
  }
});

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const developers = await getApi().developer.list();
    return developers.map((developer) => ({ slug: developer.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadDeveloper(slug);
  if (!result.ok) {
    return { title: "Developer not found", robots: { index: false } };
  }
  const { developer } = result;
  const logoUrl = resolveDeveloperAssetUrl(developer.logoKey);
  const societyCount = developer.societies.length;
  return pageMetadata({
    title: `${developer.name} — housing developer`,
    description: `${developer.name} on ${SITE.name}: ${developer.description.slice(0, 140)}${developer.description.length > 140 ? "…" : ""}${societyCount > 0 ? ` ${societyCount} ${societyCount === 1 ? "society" : "societies"} listed.` : ""}`,
    path: developerPath(slug),
    ...(logoUrl ? { ogImage: logoUrl } : {}),
    keywords: [developer.name, "housing developer Pakistan", "builder track record"],
  });
}

function DeveloperHeaderLogo({
  name,
  logoKey,
}: {
  name: string;
  logoKey?: string | null;
}) {
  const logoUrl = resolveDeveloperAssetUrl(logoKey);

  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${name} logo`}
        width={64}
        height={64}
        className="h-16 w-16 rounded-xl border border-border-base bg-surface-card object-contain p-2"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-subtle text-brand-navy-mid"
    >
      <Building2 className="h-8 w-8" />
    </span>
  );
}

function ProjectCard({ project }: { project: DeveloperProjectPublic }) {
  const imageUrl = resolveDeveloperAssetUrl(project.imageKey);

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border-base bg-surface-card shadow-sm">
      {imageUrl ? (
        <div className="relative h-40 w-full bg-surface-subtle">
          <Image
            src={imageUrl}
            alt={project.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="flex h-40 items-center justify-center bg-gradient-to-br from-brand-navy to-brand-navy-mid"
        >
          <Building2 className="h-10 w-10 text-text-inverse/70" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-sans text-md font-semibold text-text-primary">
          {project.name}
        </h3>
        {(project.city ?? project.year) ? (
          <p className="flex flex-wrap items-center gap-x-2 font-sans text-xs text-text-tertiary">
            {project.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                {project.city}
              </span>
            ) : null}
            {project.year ? <span>{project.year}</span> : null}
          </p>
        ) : null}
        {project.description ? (
          <p className="font-sans text-sm leading-relaxed text-text-secondary">
            {project.description}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function SocietyLinkCard({ society }: { society: DeveloperSocietyPublic }) {
  const path = societyPath(society.citySlug, society.slug);

  return (
    <li>
      <Link
        href={path}
        className="group flex flex-col gap-3 rounded-xl border border-border-base bg-surface-card p-5 shadow-sm transition-all duration-200 ease-default hover:-translate-y-0.5 hover:border-brand-navy-light hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light focus-visible:ring-offset-2"
      >
        <VerificationTierBadge tier={society.verificationTier as VerificationTier} />
        <div className="flex flex-col gap-1">
          <h3 className="font-sans text-lg font-bold leading-tight text-text-primary">
            {society.name}
          </h3>
          <p className="flex items-center gap-1 font-sans text-sm text-text-tertiary">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            {society.city}
          </p>
        </div>
        <span className="font-sans text-sm font-medium text-text-accent">
          View society profile
        </span>
      </Link>
    </li>
  );
}

export default async function DeveloperProfilePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const result = await loadDeveloper(slug);

  if (!result.ok) {
    if (result.reason === "not_found") notFound();
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6">
        <EmptyState
          heading="This developer profile is temporarily unavailable"
          description="We couldn't load this builder profile right now. Please try again shortly."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/societies">Browse societies</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { developer } = result;
  const path = developerPath(developer.slug);
  const logoUrl = resolveDeveloperAssetUrl(developer.logoKey);
  const societyIds = developer.societies.map((society) => society.id);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-6">
      <JsonLd
        schema={[
          developerOrganizationSchema({
            name: developer.name,
            description: developer.description,
            path,
            ...(logoUrl ? { logoUrl } : {}),
            ...(developer.websiteUrl ? { websiteUrl: developer.websiteUrl } : {}),
            ...(developer.foundedYear !== null && developer.foundedYear !== undefined
              ? { foundedYear: developer.foundedYear }
              : {}),
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Developers", path: "/developers" },
            { name: developer.name, path },
          ]),
        ]}
      />

      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1.5 font-sans text-xs text-text-tertiary">
          <li>
            <Link href="/" className="hover:text-text-secondary">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-text-secondary">{developer.name}</li>
        </ol>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <DeveloperHeaderLogo name={developer.name} logoKey={developer.logoKey} />
        <div className="flex flex-col gap-2">
          <h1 className="font-sans text-3xl font-bold text-text-primary">
            {developer.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 font-sans text-sm text-text-tertiary">
            {developer.foundedYear ? (
              <span>Est. {developer.foundedYear}</span>
            ) : null}
            {developer.websiteUrl ? (
              <a
                href={developer.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center gap-1 text-text-accent hover:text-brand-navy-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light focus-visible:ring-offset-2"
              >
                Official website
                <ExternalLink aria-hidden="true" className="h-4 w-4" />
              </a>
            ) : null}
          </div>
          <p className="max-w-3xl font-sans text-sm leading-relaxed text-text-secondary">
            {developer.description}
          </p>
        </div>
      </header>

      <section className="mt-12">
        <SectionHeading
          eyebrow="Track record"
          title="Past projects"
          description="Platform-curated portfolio of completed and in-progress developments — builder credibility, not a sales directory."
        />
        <div className="mt-8">
          {developer.projects.length === 0 ? (
            <EmptyState
              heading="No track-record projects listed yet"
              description={`${developer.name} hasn't published a project portfolio on ${SITE.name} yet.`}
            />
          ) : (
            <ul
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-live="polite"
            >
              {developer.projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-12 border-t border-border-base pt-12">
        <SectionHeading
          eyebrow="On Sectoria"
          title="Societies by this developer"
          description="Verified housing societies linked to this builder on the marketplace."
        />
        <div className="mt-8">
          {developer.societies.length === 0 ? (
            <EmptyState
              heading="No societies linked yet"
              description={`${developer.name} doesn't have any published societies on ${SITE.name} yet.`}
              action={
                <Button asChild variant="ghost" size="sm">
                  <Link href="/societies">Browse all societies</Link>
                </Button>
              }
            />
          ) : (
            <ul
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-live="polite"
            >
              {developer.societies.map((society) => (
                <SocietyLinkCard key={society.id} society={society} />
              ))}
            </ul>
          )}
        </div>
      </section>

      {societyIds.length > 0 ? (
        <section className="mt-12 border-t border-border-base pt-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-start">
            <BentoGrid className="lg:col-span-1">
              <BentoCell size="wide" className="flex flex-col gap-2">
                <h2 className="font-sans text-lg font-bold text-text-primary">
                  Compare options with an advisor
                </h2>
                <p className="font-sans text-sm text-text-secondary">
                  Sectoria advisors negotiate with authorized dealers on your
                  behalf — no direct builder or dealer contact is shared upfront.
                </p>
              </BentoCell>
            </BentoGrid>
            <QuoteRequestForm
              societyIds={societyIds}
              source={LeadSource.SOCIETY}
              heading="Talk to an advisor"
              description="Tell us which of this developer's societies you're interested in. A Sectoria advisor will call with the best available quote."
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
