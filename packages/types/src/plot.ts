import { z } from "zod";
import { idSchema } from "./common.js";

/** Lifecycle of an individual plot within an inventory category. */
export const PlotStatus = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  ALLOCATED: "ALLOCATED",
  TRANSFERRED: "TRANSFERRED",
} as const;
export type PlotStatus = (typeof PlotStatus)[keyof typeof PlotStatus];
export const plotStatusSchema = z.nativeEnum(PlotStatus);

/**
 * A single physical plot/file. `serialNo` is the stable internal ordering
 * key (used by FIFO allocation); `plotNo` is the society's own label and
 * may be assigned later, hence nullable.
 */
export const plotSchema = z.object({
  id: idSchema,
  categoryId: idSchema,
  serialNo: z.string().min(1),
  plotNo: z.string().nullable().optional(),
  status: plotStatusSchema,
  bookingId: idSchema.nullable().optional(),
});
export type Plot = z.infer<typeof plotSchema>;
