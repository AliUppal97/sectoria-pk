import Image from "next/image";
import { EmptyState, Skeleton, StatusBadge, formatPKR } from "@sectoria/ui";
import {
  CategoryCard,
  type CategoryView,
} from "@/components/marketplace/category-card";
import {
  SOCIETY_MEDIA_BLUR_DATA_URL,
  type SocietyMediaPublic,
} from "@/lib/society-media";
import {
  groupCategoriesByPhase,
  type PhaseGroup,
} from "@/lib/society-phases";

function PhaseSummaryStats({ phase }: { phase: PhaseGroup }) {
  const soldOut = phase.availableUnits <= 0;

  return (
    <dl className="flex flex-wrap gap-4 font-sans text-sm">
      <div className="flex flex-col gap-0.5">
        <dt className="text-xs text-text-tertiary">Starting from</dt>
        <dd className="font-mono font-semibold text-text-primary">
          {formatPKR(phase.startingPrice)}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-xs text-text-tertiary">Availability</dt>
        <dd>
          {soldOut ? (
            <StatusBadge variant="danger">Sold out</StatusBadge>
          ) : (
            <StatusBadge variant="success">
              {phase.availableUnits} of {phase.totalUnits} plots available
            </StatusBadge>
          )}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-xs text-text-tertiary">Blocks</dt>
        <dd className="text-text-secondary">{phase.blocks.join(", ")}</dd>
      </div>
    </dl>
  );
}

function PhaseSection({
  phase,
  citySlug,
  societySlug,
}: {
  phase: PhaseGroup;
  citySlug: string;
  societySlug: string;
}) {
  return (
    <section
      id={phase.anchorId}
      className="scroll-mt-20 flex flex-col gap-6 rounded-xl border border-border-base bg-surface-card p-5 sm:p-6"
      aria-labelledby={`${phase.anchorId}-heading`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h3
            id={`${phase.anchorId}-heading`}
            className="font-sans text-lg font-bold text-text-primary"
          >
            {phase.phase}
          </h3>
          <PhaseSummaryStats phase={phase} />
        </div>

        {phase.image ? (
          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-border-base bg-surface-subtle lg:max-w-xs">
            <Image
              src={phase.image.url}
              alt={phase.image.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 320px"
              className="object-cover"
              placeholder="blur"
              blurDataURL={SOCIETY_MEDIA_BLUR_DATA_URL}
            />
          </div>
        ) : null}
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {phase.categories.map((category) => (
          <li key={category.id}>
            <CategoryCard
              citySlug={citySlug}
              societySlug={societySlug}
              category={category}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Content-shaped skeleton for deferred phase loads. */
export function SocietyPhasesSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

/**
 * Inventory grouped by phase/sub-community (M7). Each phase shows blocks,
 * category cards, pricing summary, and an optional gallery image. The flat
 * category grid on the profile remains available below this section.
 */
export function SocietyPhases({
  citySlug,
  societySlug,
  categories,
  media = [],
  degraded = false,
  loading = false,
}: {
  citySlug: string;
  societySlug: string;
  categories: readonly CategoryView[];
  media?: readonly SocietyMediaPublic[];
  degraded?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <SocietyPhasesSkeleton />;
  }

  if (degraded) {
    return (
      <EmptyState
        heading="Phase inventory temporarily unavailable"
        description="We couldn't group categories by phase right now. The full category list below may still be available."
      />
    );
  }

  if (categories.length === 0) return null;

  const phases = groupCategoriesByPhase(categories, media);
  if (phases.length === 0) return null;

  return (
    <div className="flex flex-col gap-8" aria-live="polite">
      <div className="flex flex-col gap-1">
        <h3 className="font-sans text-md font-semibold text-text-primary">
          By phase
        </h3>
        <p className="font-sans text-sm text-text-secondary">
          Explore inventory grouped by development phase — each section lists
          its blocks, starting price, and available plot categories.
        </p>
      </div>

      {phases.map((phase) => (
        <PhaseSection
          key={phase.phase}
          phase={phase}
          citySlug={citySlug}
          societySlug={societySlug}
        />
      ))}
    </div>
  );
}
