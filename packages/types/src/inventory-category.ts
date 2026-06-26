import { z } from "zod";
import { decimalStringSchema, idSchema, slugSchema } from "./common.js";

/** Whether a category's plots are residential or commercial. */
export const PlotType = {
  RESIDENTIAL: "RESIDENTIAL",
  COMMERCIAL: "COMMERCIAL",
} as const;
export type PlotType = (typeof PlotType)[keyof typeof PlotType];
export const plotTypeSchema = z.nativeEnum(PlotType);

/**
 * How plots in a category are handed out:
 * - `FIFO`: first confirmed escrow token gets the next serial plot.
 * - `BALLOT`: bookings pool until a deterministic ballot draw runs.
 */
export const AllocationStrategy = {
  FIFO: "FIFO",
  BALLOT: "BALLOT",
} as const;
export type AllocationStrategy =
  (typeof AllocationStrategy)[keyof typeof AllocationStrategy];
export const allocationStrategySchema = z.nativeEnum(AllocationStrategy);

/**
 * A sellable inventory bucket within a society (a phase/block/size combo).
 * `pricePerSqft` is a decimal string, not a float, to keep pricing math
 * exact — see `common.ts`.
 */
export const inventoryCategorySchema = z.object({
  id: idSchema,
  societyId: idSchema,
  slug: slugSchema,
  phase: z.string().min(1),
  block: z.string().min(1),
  plotType: plotTypeSchema,
  /** Display label such as "5 Marla" or "1 Kanal". */
  sizeLabel: z.string().min(1),
  sizeSqft: z.number().int().positive(),
  pricePerSqft: decimalStringSchema,
  totalUnits: z.number().int().nonnegative(),
  availableUnits: z.number().int().nonnegative(),
  allocationStrategy: allocationStrategySchema,
  /** FBR valuation zone key used to look up the table value for tax. */
  fbrValuationZone: z.string().min(1),
});
export type InventoryCategory = z.infer<typeof inventoryCategorySchema>;
