import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common.js";
import { escrowStateSchema } from "./escrow.js";
import { taxBreakdownSchema } from "./tax.js";

/**
 * A buyer's booking of an inventory category. `taxBreakdown` is a snapshot
 * captured from `packages/domain/tax` at booking time, so the figures the
 * buyer agreed to are frozen even if rate tables change later. `dealerId`
 * is null for direct (non-dealer) bookings.
 */
export const bookingSchema = z.object({
  id: idSchema,
  buyerId: idSchema,
  categoryId: idSchema,
  paymentPlanId: idSchema,
  dealerId: idSchema.nullable().optional(),
  status: escrowStateSchema,
  taxBreakdown: taxBreakdownSchema,
  allocatedPlotId: idSchema.nullable().optional(),
  createdAt: isoDateTimeSchema,
});
export type Booking = z.infer<typeof bookingSchema>;
