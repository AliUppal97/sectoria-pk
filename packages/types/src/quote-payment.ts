import { z } from "zod";
import { idSchema, isoDateTimeSchema, pkrAmountSchema } from "./common.js";

export const QuotePaymentType = {
  TOKEN: "TOKEN",
  INSTALLMENT: "INSTALLMENT",
} as const;
export type QuotePaymentType =
  (typeof QuotePaymentType)[keyof typeof QuotePaymentType];
export const quotePaymentTypeSchema = z.enum([
  QuotePaymentType.TOKEN,
  QuotePaymentType.INSTALLMENT,
]);

export const QuotePaymentStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;
export type QuotePaymentStatus =
  (typeof QuotePaymentStatus)[keyof typeof QuotePaymentStatus];
export const quotePaymentStatusSchema = z.enum([
  QuotePaymentStatus.PENDING,
  QuotePaymentStatus.CONFIRMED,
  QuotePaymentStatus.FAILED,
  QuotePaymentStatus.REFUNDED,
]);

export const quotePaymentSchema = z.object({
  id: idSchema,
  quoteId: idSchema,
  type: quotePaymentTypeSchema,
  amountPkr: pkrAmountSchema,
  installmentIndex: z.number().int().nonnegative().nullable().optional(),
  status: quotePaymentStatusSchema,
  externalEventId: z.string().nullable().optional(),
  createdAt: isoDateTimeSchema,
});
export type QuotePayment = z.infer<typeof quotePaymentSchema>;
