import { z } from "zod";
import { idSchema, isoDateTimeSchema } from "./common.js";

export const FulfillmentStatus = {
  PENDING: "PENDING",
  ALLOCATED: "ALLOCATED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type FulfillmentStatus =
  (typeof FulfillmentStatus)[keyof typeof FulfillmentStatus];
export const fulfillmentStatusSchema = z.enum([
  FulfillmentStatus.PENDING,
  FulfillmentStatus.ALLOCATED,
  FulfillmentStatus.COMPLETED,
  FulfillmentStatus.CANCELLED,
]);

/**
 * Post-token dealer task. Intentionally excludes buyer phone/CNIC.
 */
export const fulfillmentOrderSchema = z.object({
  id: idSchema,
  quoteId: idSchema,
  dealerId: idSchema,
  orderRef: z.string().min(1),
  status: fulfillmentStatusSchema,
  plotRef: z.string().nullable().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type FulfillmentOrder = z.infer<typeof fulfillmentOrderSchema>;
