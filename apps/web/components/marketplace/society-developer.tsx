import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { EmptyState, Skeleton } from "@sectoria/ui";
import { BentoCell } from "@/components/marketplace/bento";
import {
  developerShortBio,
  resolveDeveloperAssetUrl,
  type DeveloperSummary,
} from "@/lib/developer";
import { developerPath } from "@/lib/marketplace";

function DeveloperLogo({
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
        width={48}
        height={48}
        className="h-12 w-12 rounded-lg border border-border-base bg-surface-card object-contain p-1"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-subtle text-brand-navy-mid"
    >
      <Building2 className="h-6 w-6" />
    </span>
  );
}

/** Content-shaped skeleton for deferred developer loads. */
export function SocietyDeveloperSkeleton() {
  return (
    <BentoCell size="wide" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-56" />
      </div>
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-4 w-3/4 max-w-md" />
        </div>
      </div>
    </BentoCell>
  );
}

/**
 * Developer credibility block (M5) — logo, name, short bio, and a link to the
 * builder's track-record page. Hidden when no developer is linked.
 */
export function SocietyDeveloper({
  developer,
  degraded = false,
  loading = false,
}: {
  developer: DeveloperSummary | null | undefined;
  degraded?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <SocietyDeveloperSkeleton />;
  }

  if (degraded) {
    return (
      <BentoCell size="wide" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-sans text-md font-semibold text-text-primary">
            Developer
          </h2>
          <p className="font-sans text-sm text-text-secondary">
            Platform-curated builder behind this society.
          </p>
        </div>
        <EmptyState
          heading="Developer profile temporarily unavailable"
          description="We couldn't load builder information for this society right now. Other trust signals above are still available."
        />
      </BentoCell>
    );
  }

  if (!developer) return null;

  const profilePath = developerPath(developer.slug);
  const bio = developerShortBio(developer.description);

  return (
    <BentoCell size="wide" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-sans text-md font-semibold text-text-primary">
          Developer
        </h2>
        <p className="font-sans text-sm text-text-secondary">
          Platform-curated builder behind this society — view their track record
          on Sectoria.
        </p>
      </div>

      <Link
        href={profilePath}
        className="group flex min-h-[44px] items-start gap-4 rounded-xl border border-border-base bg-surface-base p-4 transition-colors duration-200 ease-default hover:border-brand-navy-light hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy-light focus-visible:ring-offset-2"
      >
        <DeveloperLogo name={developer.name} logoKey={developer.logoKey} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-sans text-sm font-semibold text-text-primary">
            {developer.name}
          </span>
          {developer.foundedYear ? (
            <span className="font-sans text-xs text-text-tertiary">
              Est. {developer.foundedYear}
            </span>
          ) : null}
          <span className="font-sans text-sm leading-relaxed text-text-secondary">
            {bio}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 font-sans text-xs font-medium text-text-accent">
          View profile
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform duration-200 ease-default group-hover:translate-x-0.5"
          />
        </span>
      </Link>
    </BentoCell>
  );
}
