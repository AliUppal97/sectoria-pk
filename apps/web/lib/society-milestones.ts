import { MilestoneStatus, type SocietyMilestone } from "@sectoria/types";

/** Public milestone row from `milestone.listForSociety`. */
export type SocietyMilestonePublic = SocietyMilestone;

export const MILESTONE_STATUS_LABEL: Record<
  (typeof MilestoneStatus)[keyof typeof MilestoneStatus],
  string
> = {
  [MilestoneStatus.COMPLETED]: "Completed",
  [MilestoneStatus.IN_PROGRESS]: "In progress",
  [MilestoneStatus.PLANNED]: "Planned",
};

export const MILESTONE_STATUS_VARIANT: Record<
  (typeof MilestoneStatus)[keyof typeof MilestoneStatus],
  "success" | "info" | "neutral"
> = {
  [MilestoneStatus.COMPLETED]: "success",
  [MilestoneStatus.IN_PROGRESS]: "info",
  [MilestoneStatus.PLANNED]: "neutral",
};

/** Month/year label for roadmap nodes — e.g. "AUG 2024". */
export function formatMilestoneDateLabel(occurredOn: string): string {
  const date = new Date(occurredOn);
  const month = date
    .toLocaleString("en-GB", { month: "short", timeZone: "UTC" })
    .toUpperCase();
  return `${month} ${date.getUTCFullYear()}`;
}

/** Oldest-first ordering for roadmap display (API returns newest-first). */
export function sortMilestonesChronologically(
  milestones: readonly SocietyMilestonePublic[],
): SocietyMilestonePublic[] {
  return [...milestones].sort(
    (a, b) =>
      new Date(a.occurredOn).getTime() - new Date(b.occurredOn).getTime() ||
      a.sortOrder - b.sortOrder,
  );
}
