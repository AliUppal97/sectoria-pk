import { z } from "zod";
import { decimalStringSchema, pkrAmountSchema } from "./common.js";

/** Snapshot of Sectoria margin and fees frozen at quote/payment time. */
export const platformFeeSnapshotSchema = z.object({
  spreadPkr: pkrAmountSchema,
  tokenAmountPkr: pkrAmountSchema,
  servicingFeePct: decimalStringSchema.optional(),
});
export type PlatformFeeSnapshot = z.infer<typeof platformFeeSnapshotSchema>;
