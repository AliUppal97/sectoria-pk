import { EmptyState, Skeleton, StatusBadge } from "@sectoria/ui";
import {
  MILESTONE_STATUS_LABEL,
  MILESTONE_STATUS_VARIANT,
  formatMilestoneDateLabel,
  sortMilestonesChronologically,
  type SocietyMilestonePublic,
} from "@/lib/society-milestones";

function MilestoneNode({ milestone }: { milestone: SocietyMilestonePublic }) {
  const dateLabel = formatMilestoneDateLabel(milestone.occurredOn);

  return (
    <li className="relative flex flex-col gap-2 rounded-xl border border-border-base bg-surface-card p-5 pl-8 sm:pl-10">
      <span
        aria-hidden="true"
        className="absolute left-4 top-6 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-brand-navy-mid bg-surface-card sm:left-5"
      />
      <div className="flex flex-wrap items-center gap-2">
        <time
          dateTime={milestone.occurredOn}
          className="font-mono text-xs font-semibold uppercase tracking-[0.06em] text-text-accent"
        >
          {dateLabel}
        </time>
        <StatusBadge variant={MILESTONE_STATUS_VARIANT[milestone.status]}>
          {MILESTONE_STATUS_LABEL[milestone.status]}
        </StatusBadge>
      </div>
      <h3 className="font-sans text-md font-semibold text-text-primary">
        {milestone.title}
      </h3>
      {milestone.description ? (
        <p className="font-sans text-sm leading-relaxed text-text-secondary">
          {milestone.description}
        </p>
      ) : null}
    </li>
  );
}

/** Content-shaped skeleton for deferred milestone loads. */
export function SocietyRoadmapSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

/**
 * Structured development roadmap (M6) — dated milestones with status styling.
 * Renders above the news timeline; hidden when no milestones exist.
 */
export function SocietyRoadmap({
  milestones,
  degraded = false,
  loading = false,
}: {
  milestones: readonly SocietyMilestonePublic[];
  degraded?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <SocietyRoadmapSkeleton />;
  }

  if (degraded) {
    return (
      <EmptyState
        heading="Development roadmap temporarily unavailable"
        description="We couldn't load milestone history for this society right now. Official news updates below may still be available."
      />
    );
  }

  if (milestones.length === 0) return null;

  const ordered = sortMilestonesChronologically(milestones);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-sans text-md font-semibold text-text-primary">
          Development roadmap
        </h3>
        <p className="font-sans text-sm text-text-secondary">
          Key milestones in this society&apos;s delivery timeline — oldest to
          newest.
        </p>
      </div>

      <ol
        className="relative flex flex-col gap-4 border-l-2 border-border-base pl-4 sm:pl-5"
        aria-live="polite"
      >
        {ordered.map((milestone) => (
          <MilestoneNode key={milestone.id} milestone={milestone} />
        ))}
      </ol>
    </div>
  );
}
