import { EmptyState, StatusBadge, formatDate } from "@sectoria/ui";
import type { SocietyUpdateCategory } from "@sectoria/types";

const UPDATE_CATEGORY_LABEL: Record<SocietyUpdateCategory, string> = {
  NOC: "NOC",
  LICENSE: "License",
  POSSESSION: "Possession",
  BOOKING: "Booking",
  DEVELOPMENT: "Development",
  GENERAL: "General",
};

const UPDATE_CATEGORY_VARIANT: Record<
  SocietyUpdateCategory,
  "success" | "info" | "warning" | "neutral"
> = {
  NOC: "success",
  LICENSE: "success",
  POSSESSION: "info",
  BOOKING: "warning",
  DEVELOPMENT: "info",
  GENERAL: "neutral",
};

interface UpdateView {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly category: SocietyUpdateCategory;
  readonly publishedAt: string;
}

export function SocietyUpdatesTimeline({
  updates,
}: {
  updates: readonly UpdateView[];
}) {
  if (updates.length === 0) {
    return (
      <EmptyState
        heading="No published updates yet"
        description="When this society publishes NOC milestones, possession news, or booking announcements, they will appear here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {updates.map((update) => (
        <li
          key={update.id}
          className="flex flex-col gap-2 rounded-xl border border-border-base bg-surface-card p-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={UPDATE_CATEGORY_VARIANT[update.category]}>
              {UPDATE_CATEGORY_LABEL[update.category]}
            </StatusBadge>
            <time
              dateTime={update.publishedAt}
              className="font-sans text-xs text-text-tertiary"
            >
              {formatDate(update.publishedAt)}
            </time>
          </div>
          <h3 className="font-sans text-md font-semibold text-text-primary">
            {update.title}
          </h3>
          <p className="font-sans text-sm leading-relaxed text-text-secondary">
            {update.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
