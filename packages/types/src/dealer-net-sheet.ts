import { z } from "zod";
import { idSchema, isoDateTimeSchema, pkrAmountSchema } from "./common.js";

/**
 * Confidential wholesale pricing from an authorized dealer.
 * Never exposed on public API responses or to buyers.
 */
export const dealerNetSheetSchema = z.object({
  id: idSchema,
  dealerId: idSchema,
  categoryId: idSchema,
  netPricePkr: pkrAmountSchema,
  paymentPlanTerms: z.string().nullable().optional(),
  refreshedAt: isoDateTimeSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type DealerNetSheet = z.infer<typeof dealerNetSheetSchema>;

export const upsertDealerNetSheetInputSchema = z.object({
  categoryId: idSchema,
  netPricePkr: pkrAmountSchema,
  paymentPlanTerms: z.string().optional(),
});
export type UpsertDealerNetSheetInput = z.infer<
  typeof upsertDealerNetSheetInputSchema
>;
