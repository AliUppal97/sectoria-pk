import { z } from "zod";
import { idSchema, isoDateTimeSchema, pkrAmountSchema } from "./common.js";

/** Where a lead originated on the public site. */
export const LeadSource = {
  COMPARE: "compare",
  CATEGORY: "category",
  SUPPORT: "support",
  SOCIETY: "society",
} as const;
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];
export const leadSourceSchema = z.enum([
  LeadSource.COMPARE,
  LeadSource.CATEGORY,
  LeadSource.SUPPORT,
  LeadSource.SOCIETY,
]);

/** Pipeline status for ops CRM. */
export const LeadStatus = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  QUOTED: "QUOTED",
  WON: "WON",
  LOST: "LOST",
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];
export const leadStatusSchema = z.enum([
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUOTED,
  LeadStatus.WON,
  LeadStatus.LOST,
]);

/** Public quote request — no dealer net data on this shape. */
export const leadSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().nullable().optional(),
  societyIds: z.array(idSchema),
  categoryId: idSchema.nullable().optional(),
  budgetPkr: pkrAmountSchema.nullable().optional(),
  paymentPlanPreference: z.string().nullable().optional(),
  source: leadSourceSchema,
  status: leadStatusSchema,
  notes: z.string().nullable().optional(),
  buyerUserId: idSchema.nullable().optional(),
  assignedAdvisorId: idSchema.nullable().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Lead = z.infer<typeof leadSchema>;

/** Input for anonymous or logged-in quote requests from the public site. */
export const createLeadInputSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  societyIds: z.array(idSchema),
  categoryId: idSchema.optional(),
  budgetPkr: pkrAmountSchema.optional(),
  paymentPlanPreference: z.string().optional(),
  source: leadSourceSchema,
}).refine(
  (data) => data.source === LeadSource.SUPPORT || data.societyIds.length >= 1,
  { message: "Select at least one society", path: ["societyIds"] },
);
export type CreateLeadInput = z.infer<typeof createLeadInputSchema>;
