import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common.js";

/**
 * Status of a society development milestone on the roadmap timeline.
 * Mirrors the Prisma `MilestoneStatus` enum.
 */
export const MilestoneStatus = {
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "IN_PROGRESS",
  PLANNED: "PLANNED",
} as const;
export type MilestoneStatus =
  (typeof MilestoneStatus)[keyof typeof MilestoneStatus];
export const milestoneStatusSchema = z.nativeEnum(MilestoneStatus);

/** A dated milestone on a society's development roadmap. */
export const societyMilestoneSchema = z.object({
  id: idSchema,
  societyId: idSchema,
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  occurredOn: isoDateTimeSchema,
  status: milestoneStatusSchema,
  sortOrder: z.number().int().nonnegative(),
});
export type SocietyMilestone = z.infer<typeof societyMilestoneSchema>;
