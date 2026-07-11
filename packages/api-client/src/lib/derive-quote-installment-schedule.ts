import {
  InstallmentInterval,
  type InstallmentInterval as InstallmentIntervalType,
  type QuoteInstallmentScheduleRow,
  QuoteInstallmentScheduleStatus,
  pkrAmountSchema,
} from "@sectoria/types";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export interface PaymentPlanScheduleSource {
  readonly label: string;
  readonly installmentCount: number;
  readonly installmentInterval: InstallmentIntervalType;
}

export interface DeriveQuoteInstallmentScheduleInput {
  readonly quotedPricePkr: number;
  readonly tokenAmountPkr: number;
  readonly paymentPlan: PaymentPlanScheduleSource;
  /** Token payment date — first installment falls one interval after this. */
  readonly scheduleAnchor: Date;
  readonly paidInstallmentIndexes: ReadonlySet<number>;
}

/** Sectoria servicing fee on platform-collected installments (Option B). */
export const DEFAULT_INSTALLMENT_SERVICING_FEE_PCT = "1.5";

/** Case-insensitive label match between quote and category payment plan. */
export function matchPaymentPlanByLabel<T extends { readonly label: string }>(
  plans: readonly T[],
  paymentPlanLabel: string | null | undefined,
): T | null {
  if (paymentPlanLabel === null || paymentPlanLabel === undefined) {
    return null;
  }
  const normalized = paymentPlanLabel.trim().toLowerCase();
  return (
    plans.find((plan) => plan.label.trim().toLowerCase() === normalized) ?? null
  );
}

/** Splits post-token balance into equal installments; remainder on the last row. */
export function deriveInstallmentAmountsPkr(
  quotedPricePkr: number,
  tokenAmountPkr: number,
  installmentCount: number,
): number[] {
  if (installmentCount <= 0) return [];
  const remaining = quotedPricePkr - tokenAmountPkr;
  if (remaining <= 0) return Array.from({ length: installmentCount }, () => 0);

  const perInstallment = Math.floor(remaining / installmentCount);
  return Array.from({ length: installmentCount }, (_, index) => {
    if (index === installmentCount - 1) {
      return remaining - perInstallment * (installmentCount - 1);
    }
    return perInstallment;
  }).map((amount) => pkrAmountSchema.parse(amount));
}

function addInterval(
  anchor: Date,
  interval: InstallmentIntervalType,
  steps: number,
): Date {
  const due = new Date(anchor.getTime());
  if (interval === InstallmentInterval.LUMP_SUM || steps <= 0) {
    return due;
  }
  const monthsPerStep =
    interval === InstallmentInterval.QUARTERLY ? 3 : 1;
  due.setUTCMonth(due.getUTCMonth() + monthsPerStep * steps);
  return due;
}

function formatDueDateUtc(date: Date): string {
  const day = date.getUTCDate();
  const month = MONTH_LABELS[date.getUTCMonth()] ?? "???";
  const year = date.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

function buildDueLabel(index: number, dueDate: Date): string {
  return `Installment ${index + 1} · ${formatDueDateUtc(dueDate)}`;
}

/**
 * Builds buyer-visible installment rows from quote pricing and the matched
 * category payment plan. Returns an empty array for lump-sum / zero-count plans.
 */
export function deriveQuoteInstallmentSchedule(
  input: DeriveQuoteInstallmentScheduleInput,
): QuoteInstallmentScheduleRow[] {
  const { paymentPlan } = input;
  if (
    paymentPlan.installmentCount <= 0 ||
    paymentPlan.installmentInterval === InstallmentInterval.LUMP_SUM
  ) {
    return [];
  }

  const amounts = deriveInstallmentAmountsPkr(
    input.quotedPricePkr,
    input.tokenAmountPkr,
    paymentPlan.installmentCount,
  );

  return amounts.map((amountPkr, index) => {
    const dueDate = addInterval(
      input.scheduleAnchor,
      paymentPlan.installmentInterval,
      index + 1,
    );
    return {
      index,
      dueDate: dueDate.toISOString(),
      dueLabel: buildDueLabel(index, dueDate),
      amountPkr: pkrAmountSchema.parse(amountPkr),
      status: input.paidInstallmentIndexes.has(index)
        ? QuoteInstallmentScheduleStatus.PAID
        : QuoteInstallmentScheduleStatus.PENDING,
    } satisfies QuoteInstallmentScheduleRow;
  });
}

/** Index of the lowest unpaid installment, or null when the schedule is complete. */
export function findNextUnpaidInstallmentIndex(
  schedule: readonly QuoteInstallmentScheduleRow[],
): number | null {
  const next = schedule.find(
    (row) => row.status === QuoteInstallmentScheduleStatus.PENDING,
  );
  return next?.index ?? null;
}
