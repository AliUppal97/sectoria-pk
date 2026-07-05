import { EmptyState, Skeleton } from "@sectoria/ui";
import { Sparkles } from "lucide-react";
import { LUCIDE_ICON_MAP } from "@/lib/lucide-icon";
import type { SocietyHighlightPublic } from "@/lib/society-features";

function HighlightStat({ highlight }: { highlight: SocietyHighlightPublic }) {
  const Icon =
    LUCIDE_ICON_MAP[highlight.icon?.trim().toLowerCase() ?? ""] ?? Sparkles;

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border-base bg-surface-card p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-subtle text-brand-navy-mid">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xl font-semibold leading-tight text-text-primary sm:text-2xl">
          {highlight.value}
        </span>
        <span className="font-sans text-xs text-text-tertiary">
          {highlight.label}
        </span>
      </div>
    </li>
  );
}

/** Content-shaped skeleton for deferred highlight loads. */
export function SocietyHighlightsSkeleton() {
  return (
    <section
      className="border-b border-border-base bg-surface-subtle"
      aria-hidden="true"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Stat strip from SocietyHighlight rows (M3) — rendered near the hero/trust
 * bento as a responsive metrics band.
 */
export function SocietyHighlights({
  highlights,
  degraded = false,
  loading = false,
}: {
  highlights: readonly SocietyHighlightPublic[];
  degraded?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return <SocietyHighlightsSkeleton />;
  }

  if (degraded) {
    return (
      <section className="border-b border-border-base bg-surface-subtle">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
          <EmptyState
            heading="Society stats temporarily unavailable"
            description="We couldn't load highlight figures for this profile right now. Other sections below are still available."
          />
        </div>
      </section>
    );
  }

  if (highlights.length === 0) return null;

  return (
    <section className="border-b border-border-base bg-surface-subtle">
      <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
        <ul
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          aria-live="polite"
        >
          {highlights.map((highlight) => (
            <HighlightStat key={highlight.id} highlight={highlight} />
          ))}
        </ul>
      </div>
    </section>
  );
}
