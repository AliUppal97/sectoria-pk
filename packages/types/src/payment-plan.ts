import { z } from "zod";
import { decimalStringSchema, idSchema } from "./common.js";

/**
 * Cadence at which installments fall due. A closed string set rather than
 * a Prisma enum because the underlying column is a free `String`; the
 * literal values here are the only ones the application emits or accepts.
 */
export const InstallmentInterval = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  LUMP_SUM: "lump-sum",
} as const;
export type InstallmentInterval =
  (typeof InstallmentInterval)[keyof typeof InstallmentInterval];
export const installmentIntervalSchema = z.nativeEnum(InstallmentInterval);

/**
 * A purchase plan offered for a category. `downPaymentPct` is a decimal
 * string (e.g. `"20"` or `"12.5"`) to avoid float rounding on percentages.
 */
export const paymentPlanSchema = z.object({
  id: idSchema,
  categoryId: idSchema,
  /** e.g. "Lump Sum (5% discount)", "3-Year Installments". */
  label: z.string().min(1),
  downPaymentPct: decimalStringSchema,
  installmentCount: z.number().int().nonnegative(),
  installmentInterval: installmentIntervalSchema,
});
export type PaymentPlan = z.infer<typeof paymentPlanSchema>;
