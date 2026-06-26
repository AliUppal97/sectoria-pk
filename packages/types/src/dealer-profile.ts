import { z } from "zod";
import { idSchema, slugSchema } from "./common.js";

/**
 * A society-authorized sales partner's public profile.
 *
 * Domain vocabulary:
 * - `dnfbp` — Designated Non-Financial Business or Profession; dealers must
 *   hold a valid DNFBP registration to transact, verified via its adapter.
 */
export const dealerProfileSchema = z.object({
  id: idSchema,
  userId: idSchema,
  slug: slugSchema,
  agencyName: z.string().min(1),
  dnfbpCertNumber: z.string().nullable().optional(),
  dnfbpVerified: z.boolean(),
  completedDeals: z.number().int().nonnegative(),
});
export type DealerProfile = z.infer<typeof dealerProfileSchema>;
