import { describe, expect, it } from "vitest";
import {
  AtlStatus,
  PlotType,
  taxCalculationInputSchema,
  type AtlStatus as AtlStatusValue,
  type TaxCalculationInput,
} from "@sectoria/types";
import { calculateTransferTax } from "../calculate-transfer-tax.js";
import { CURRENT_FISCAL_YEAR_RATES } from "../tax-rate-table.js";
import { InvalidTaxInputError } from "../errors.js";

/**
 * Builds a valid, schema-branded {@link TaxCalculationInput}. Defaults keep
 * the taxable value (PKR 100,000 = 10,000,000 paisa) well below the Section
 * 7E threshold so the ATL-combination assertions can isolate 236C/236K.
 */
function makeInput(
  overrides: Partial<{
    salePrice: number;
    fbrTableValue: number;
    sellerAtlStatus: AtlStatusValue;
    buyerAtlStatus: AtlStatusValue;
    plotType: (typeof PlotType)[keyof typeof PlotType];
  }> = {},
): TaxCalculationInput {
  return taxCalculationInputSchema.parse({
    salePrice: 10_000_000,
    fbrTableValue: 10_000_000,
    sellerAtlStatus: AtlStatus.FILER,
    buyerAtlStatus: AtlStatus.FILER,
    plotType: PlotType.RESIDENTIAL,
    ...overrides,
  });
}

// Expected advance-tax amounts on a 10,000,000-paisa (PKR 100,000) taxable
// value, derived directly from CURRENT_FISCAL_YEAR_RATES. Kept here as plain
// literals so a rate change forces an intentional test update (domain-logic.mdc).
const EXPECTED_SECTION_236C_BY_SELLER: Record<AtlStatusValue, number> = {
  [AtlStatus.FILER]: 300_000, // 3%
  [AtlStatus.LATE_FILER]: 600_000, // 6%
  [AtlStatus.NON_FILER]: 1_000_000, // 10%
};
const EXPECTED_SECTION_236K_BY_BUYER: Record<AtlStatusValue, number> = {
  [AtlStatus.FILER]: 300_000, // 3%
  [AtlStatus.LATE_FILER]: 600_000, // 6%
  [AtlStatus.NON_FILER]: 1_200_000, // 12%
};
const EXPECTED_STAMP_DUTY = 200_000; // 2%
const EXPECTED_REGULATORY_FEE = 100_000; // 1%

describe("calculateTransferTax — seller/buyer ATL combinations", () => {
  const atlStatuses = Object.values(AtlStatus);

  for (const sellerAtlStatus of atlStatuses) {
    for (const buyerAtlStatus of atlStatuses) {
      it(`charges seller=${sellerAtlStatus} 236C and buyer=${buyerAtlStatus} 236K rates`, () => {
        const breakdown = calculateTransferTax(
          makeInput({ sellerAtlStatus, buyerAtlStatus }),
        );

        const expectedSection236C =
          EXPECTED_SECTION_236C_BY_SELLER[sellerAtlStatus];
        const expectedSection236K =
          EXPECTED_SECTION_236K_BY_BUYER[buyerAtlStatus];

        expect(breakdown.section236C).toBe(expectedSection236C);
        expect(breakdown.section236K).toBe(expectedSection236K);
        expect(breakdown.stampDuty).toBe(EXPECTED_STAMP_DUTY);
        expect(breakdown.regulatoryFee).toBe(EXPECTED_REGULATORY_FEE);
        // 10,000,000 paisa (PKR 100,000) is far below the 7E threshold.
        expect(breakdown.section7E).toBe(0);
        expect(breakdown.total).toBe(
          expectedSection236C +
            expectedSection236K +
            EXPECTED_STAMP_DUTY +
            EXPECTED_REGULATORY_FEE,
        );
      });
    }
  }

  it("covers all nine seller/buyer combinations", () => {
    expect(atlStatuses.length * atlStatuses.length).toBe(9);
  });
});

describe("calculateTransferTax — Section 7E threshold boundary", () => {
  // PKR 25,000,000 = 2,500,000,000 paisa. One rupee = 100 paisa.
  const thresholdPaisa = CURRENT_FISCAL_YEAR_RATES.section7eThreshold as number;

  it("does NOT charge 7E when value is exactly at the threshold", () => {
    const breakdown = calculateTransferTax(
      makeInput({ salePrice: thresholdPaisa, fbrTableValue: thresholdPaisa }),
    );
    expect(breakdown.section7E).toBe(0);
  });

  it("charges 7E when value is one rupee above the threshold", () => {
    const oneRupeeAbove = thresholdPaisa + 100;
    const breakdown = calculateTransferTax(
      makeInput({ salePrice: oneRupeeAbove, fbrTableValue: oneRupeeAbove }),
    );
    // 1% of 2,500,000,100 paisa.
    expect(breakdown.section7E).toBe(25_000_001);
    expect(breakdown.section7E).toBeGreaterThan(0);
  });

  it("does NOT charge 7E when value is one rupee below the threshold", () => {
    const oneRupeeBelow = thresholdPaisa - 100;
    const breakdown = calculateTransferTax(
      makeInput({ salePrice: oneRupeeBelow, fbrTableValue: oneRupeeBelow }),
    );
    expect(breakdown.section7E).toBe(0);
  });
});

describe("calculateTransferTax — FBR table value floor", () => {
  it("taxes the FBR table value, not the lower agreed sale price", () => {
    const salePrice = 10_000_000; // PKR 100,000
    const fbrTableValue = 20_000_000; // PKR 200,000 — the higher of the two
    const breakdown = calculateTransferTax(
      makeInput({ salePrice, fbrTableValue }),
    );

    // 3% of the FBR value (20,000,000), NOT 3% of the sale price (10,000,000).
    expect(breakdown.section236C).toBe(600_000);
    expect(breakdown.section236C).not.toBe(300_000);
    expect(breakdown.section236K).toBe(600_000);
    expect(breakdown.stampDuty).toBe(400_000);
  });
});

describe("calculateTransferTax — invalid inputs throw a typed error", () => {
  function asInput(raw: {
    salePrice: number;
    fbrTableValue: number;
  }): TaxCalculationInput {
    return {
      ...raw,
      sellerAtlStatus: AtlStatus.FILER,
      buyerAtlStatus: AtlStatus.FILER,
      plotType: PlotType.RESIDENTIAL,
    } as unknown as TaxCalculationInput;
  }

  it("throws InvalidTaxInputError when sale price is zero", () => {
    expect(() =>
      calculateTransferTax(asInput({ salePrice: 0, fbrTableValue: 10_000_000 })),
    ).toThrow(InvalidTaxInputError);
  });

  it("throws InvalidTaxInputError when sale price is negative", () => {
    expect(() =>
      calculateTransferTax(
        asInput({ salePrice: -10_000_000, fbrTableValue: 10_000_000 }),
      ),
    ).toThrow(InvalidTaxInputError);
  });

  it("throws InvalidTaxInputError when FBR table value is zero", () => {
    expect(() =>
      calculateTransferTax(asInput({ salePrice: 10_000_000, fbrTableValue: 0 })),
    ).toThrow(InvalidTaxInputError);
  });

  it("throws InvalidTaxInputError when FBR table value is negative", () => {
    expect(() =>
      calculateTransferTax(
        asInput({ salePrice: 10_000_000, fbrTableValue: -10_000_000 }),
      ),
    ).toThrow(InvalidTaxInputError);
  });

  it("does not throw a bare Error — the thrown error is the typed subclass", () => {
    try {
      calculateTransferTax(asInput({ salePrice: 0, fbrTableValue: 0 }));
      expect.unreachable("expected calculateTransferTax to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTaxInputError);
      expect((error as InvalidTaxInputError).name).toBe("InvalidTaxInputError");
    }
  });
});

describe("calculateTransferTax — itemized breakdown", () => {
  it("returns a labelled line item for every charge", () => {
    const breakdown = calculateTransferTax(makeInput());
    const labels = breakdown.breakdown.map((item) => item.label);

    expect(breakdown.breakdown).toHaveLength(5);
    expect(labels.some((label) => label.includes("236C"))).toBe(true);
    expect(labels.some((label) => label.includes("236K"))).toBe(true);
    expect(labels.some((label) => label.includes("7E"))).toBe(true);
    expect(labels.some((label) => /stamp duty/i.test(label))).toBe(true);
    expect(labels.some((label) => /regulatory/i.test(label))).toBe(true);
  });

  it("reports a total equal to the sum of the line items", () => {
    const breakdown = calculateTransferTax(
      makeInput({ salePrice: 30_000_000, fbrTableValue: 30_000_000 }),
    );
    const lineItemSum = breakdown.breakdown.reduce(
      (sum, item) => sum + (item.amount as number),
      0,
    );
    expect(breakdown.total).toBe(lineItemSum);
  });
});

describe("CURRENT_FISCAL_YEAR_RATES — versioning", () => {
  it("carries a fiscalYear/version field", () => {
    expect(CURRENT_FISCAL_YEAR_RATES.fiscalYear).toMatch(/^\d{4}-\d{2}$/);
  });
});
