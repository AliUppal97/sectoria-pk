import { z } from "zod";
import { idSchema, isoDateTimeSchema, pkrAmountSchema } from "./common.js";

export const QuoteStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  ACCEPTED: "ACCEPTED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];
export const quoteStatusSchema = z.enum([
  QuoteStatus.DRAFT,
  QuoteStatus.SENT,
  QuoteStatus.ACCEPTED,
  QuoteStatus.EXPIRED,
  QuoteStatus.CANCELLED,
]);

/** Advisor-generated price offer to a lead. */
export const quoteSchema = z.object({
  id: idSchema,
  leadId: idSchema,
  societyId: idSchema,
  categoryId: idSchema,
  dealerId: idSchema,
  dealerNetPkr: pkrAmountSchema,
  quotedPricePkr: pkrAmountSchema,
  spreadPkr: pkrAmountSchema,
  tokenAmountPkr: pkrAmountSchema,
  validUntil: isoDateTimeSchema,
  status: quoteStatusSchema,
  paymentPlanLabel: z.string().nullable().optional(),
  installmentsDirect: z.boolean().default(false),
  createdById: idSchema,
  buyerUserId: idSchema.nullable().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Quote = z.infer<typeof quoteSchema>;

export const createQuoteDraftInputSchema = z.object({
  leadId: idSchema,
  societyId: idSchema,
  categoryId: idSchema,
  dealerId: idSchema,
  dealerNetPkr: pkrAmountSchema,
  quotedPricePkr: pkrAmountSchema,
  tokenAmountPkr: pkrAmountSchema,
  validUntil: isoDateTimeSchema,
  paymentPlanLabel: z.string().optional(),
});
export type CreateQuoteDraftInput = z.infer<typeof createQuoteDraftInputSchema>;
