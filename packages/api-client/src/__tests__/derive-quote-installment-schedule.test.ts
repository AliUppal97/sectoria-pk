import { describe, expect, it } from "vitest";
import { InstallmentInterval } from "@sectoria/types";
import {
  deriveInstallmentAmountsPkr,
  deriveQuoteInstallmentSchedule,
  findNextUnpaidInstallmentIndex,
  matchPaymentPlanByLabel,
} from "../lib/derive-quote-installment-schedule.js";

const THREE_YEAR_PLAN = {
  label: "3-Year Installments",
  installmentCount: 36,
  installmentInterval: InstallmentInterval.MONTHLY,
} as const;

describe("deriveInstallmentAmountsPkr", () => {
  it("splits the post-token balance evenly with remainder on the final installment", () => {
    const amounts = deriveInstallmentAmountsPkr(10_000_000, 2_000_000, 36);
    expect(amounts).toHaveLength(36);
    expect(amounts[0]).toBe(222_222);
    expect(amounts[35]).toBe(222_230);
    expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(8_000_000);
  });

  it("returns an empty array when installment count is zero", () => {
    expect(deriveInstallmentAmountsPkr(10_000_000, 1_000_000, 0)).toEqual([]);
  });
});

describe("deriveQuoteInstallmentSchedule", () => {
  const anchor = new Date("2026-06-01T00:00:00.000Z");

  it("marks paid indexes and labels due dates one interval after the anchor", () => {
    const schedule = deriveQuoteInstallmentSchedule({
      quotedPricePkr: 10_000_000,
      tokenAmountPkr: 2_000_000,
      paymentPlan: THREE_YEAR_PLAN,
      scheduleAnchor: anchor,
      paidInstallmentIndexes: new Set([0]),
    });

    expect(schedule).toHaveLength(36);
    expect(schedule[0]).toMatchObject({
      index: 0,
      status: "PAID",
      dueLabel: "Installment 1 · 1 Jul 2026",
    });
    expect(schedule[1]).toMatchObject({
      index: 1,
      status: "PENDING",
      dueLabel: "Installment 2 · 1 Aug 2026",
    });
  });

  it("returns no rows for lump-sum plans", () => {
    const schedule = deriveQuoteInstallmentSchedule({
      quotedPricePkr: 10_000_000,
      tokenAmountPkr: 10_000_000,
      paymentPlan: {
        label: "Lump Sum",
        installmentCount: 0,
        installmentInterval: InstallmentInterval.LUMP_SUM,
      },
      scheduleAnchor: anchor,
      paidInstallmentIndexes: new Set(),
    });
    expect(schedule).toEqual([]);
  });
});

describe("findNextUnpaidInstallmentIndex", () => {
  it("returns the lowest pending index", () => {
    const schedule = deriveQuoteInstallmentSchedule({
      quotedPricePkr: 10_000_000,
      tokenAmountPkr: 2_000_000,
      paymentPlan: THREE_YEAR_PLAN,
      scheduleAnchor: new Date("2026-06-01T00:00:00.000Z"),
      paidInstallmentIndexes: new Set([0, 1]),
    });
    expect(findNextUnpaidInstallmentIndex(schedule)).toBe(2);
  });

  it("returns null when every installment is paid", () => {
    const schedule = deriveQuoteInstallmentSchedule({
      quotedPricePkr: 1_000_000,
      tokenAmountPkr: 500_000,
      paymentPlan: {
        label: "2 installments",
        installmentCount: 2,
        installmentInterval: InstallmentInterval.QUARTERLY,
      },
      scheduleAnchor: new Date("2026-06-01T00:00:00.000Z"),
      paidInstallmentIndexes: new Set([0, 1]),
    });
    expect(findNextUnpaidInstallmentIndex(schedule)).toBeNull();
  });
});

describe("matchPaymentPlanByLabel", () => {
  it("matches plan labels case-insensitively", () => {
    const match = matchPaymentPlanByLabel(
      [{ ...THREE_YEAR_PLAN, id: "pp_1" }],
      "3-year installments",
    );
    expect(match?.label).toBe("3-Year Installments");
  });
});
