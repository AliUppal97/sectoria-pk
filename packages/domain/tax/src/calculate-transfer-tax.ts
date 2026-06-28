import {
  AtlStatus,
  taxBreakdownSchema,
  taxCalculationInputSchema,
  type AtlRateSet,
  type DecimalString,
  type TaxBreakdown,
  type TaxCalculationInput,
  type TaxRateTable,
} from "@sectoria/types";
import { CURRENT_FISCAL_YEAR_RATES } from "./tax-rate-table.js";
import { InvalidTaxInputError } from "./errors.js";

/**
 * Calculates the complete tax and fee breakdown for a property transfer under
 * Pakistani federal tax law (Income Tax Ordinance 2001, as amended).
 *
 * The taxable value is always `max(salePrice, fbrTableValue)` — a sale price
 * below the FBR table value can never be used to reduce tax owed. Advance-tax
 * rates are selected per party from their ATL (Active Taxpayer List) status,
 * and Section 7E applies only when the taxable value is strictly above the
 * configured threshold.
 *
 * Pure function: no I/O, no clock, no randomness. All rates come from the
 * versioned {@link TaxRateTable}, so a rate change is a new table entry, never
 * an edit here. See `domain-logic.mdc`.
 *
 * @see Section 236C — advance tax on sale/transfer of immovable property (seller)
 * @see Section 236K — advance tax on purchase of immovable property (buyer)
 * @see Section 7E   — tax on deemed income from immovable property
 *
 * @param input - The transfer's prices (whole rupees), each party's ATL status, and plot type.
 * @param rates - The fiscal-year rate table to price against. Defaults to
 *   {@link CURRENT_FISCAL_YEAR_RATES}; pass an older table to re-price a
 *   historical transfer.
 * @returns The itemized {@link TaxBreakdown}, with every amount in whole rupees.
 * @throws {InvalidTaxInputError} if the input fails schema validation, or if the
 *   sale price or FBR table value is not a positive amount.
 */
export function calculateTransferTax(
  input: TaxCalculationInput,
  rates: TaxRateTable = CURRENT_FISCAL_YEAR_RATES,
): TaxBreakdown {
  const parsed = taxCalculationInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new InvalidTaxInputError(
      `Invalid tax calculation input: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  const { salePrice, fbrTableValue, sellerAtlStatus, buyerAtlStatus } =
    parsed.data;

  if (salePrice <= 0) {
    throw new InvalidTaxInputError(
      "salePrice must be a positive whole-rupee amount.",
      "salePrice",
    );
  }
  if (fbrTableValue <= 0) {
    throw new InvalidTaxInputError(
      "fbrTableValue must be a positive whole-rupee amount.",
      "fbrTableValue",
    );
  }

  // FBR taxes whichever is higher — a below-table sale price never lowers tax.
  const taxableValue = Math.max(salePrice, fbrTableValue);

  const sellerRate = rateForAtlStatus(rates.section236C, sellerAtlStatus);
  const buyerRate = rateForAtlStatus(rates.section236K, buyerAtlStatus);

  const section236C = applyRate(taxableValue, sellerRate);
  const section236K = applyRate(taxableValue, buyerRate);
  const stampDuty = applyRate(taxableValue, rates.stampDuty);
  const regulatoryFee = applyRate(taxableValue, rates.regulatoryFee);

  // Section 7E is a deemed-income tax that applies only above the exemption
  // threshold; at or below the threshold the property is exempt.
  const isAboveSection7eThreshold = taxableValue > rates.section7eThreshold;
  const section7E = isAboveSection7eThreshold
    ? applyRate(taxableValue, rates.section7eRate)
    : 0;

  const total =
    section236C + section236K + section7E + stampDuty + regulatoryFee;

  // Plain numbers here; `taxBreakdownSchema.parse` below brands every amount
  // to `PkrAmount` and validates the whole-rupee, non-negative invariants.
  const breakdown = [
    {
      label: `Advance Tax — Section 236C (Seller, ${sellerAtlStatus})`,
      amount: section236C,
      description: `${formatPercent(sellerRate)} of the taxable value, withheld from the seller.`,
    },
    {
      label: `Advance Tax — Section 236K (Buyer, ${buyerAtlStatus})`,
      amount: section236K,
      description: `${formatPercent(buyerRate)} of the taxable value, collected from the buyer.`,
    },
    {
      label: "Deemed Income Tax — Section 7E",
      amount: section7E,
      description: isAboveSection7eThreshold
        ? `${formatPercent(rates.section7eRate)} of the taxable value (above the exemption threshold).`
        : "Exempt — taxable value is at or below the Section 7E threshold.",
    },
    {
      label: "Stamp Duty",
      amount: stampDuty,
      description: `${formatPercent(rates.stampDuty)} of the taxable value.`,
    },
    {
      label: "Regulatory Fee",
      amount: regulatoryFee,
      description: `${formatPercent(rates.regulatoryFee)} of the taxable value.`,
    },
  ];

  // Re-validate the assembled breakdown so the output's invariants (whole,
  // non-negative rupees) are guaranteed at the boundary, not merely assumed.
  return taxBreakdownSchema.parse({
    section236C,
    section236K,
    section7E,
    stampDuty,
    regulatoryFee,
    total,
    breakdown,
  });
}

/**
 * Selects the advance-tax rate for a party from a {@link AtlRateSet} given the
 * party's ATL (Active Taxpayer List) status.
 */
function rateForAtlStatus(
  rateSet: AtlRateSet,
  status: TaxCalculationInput["sellerAtlStatus"],
): DecimalString {
  switch (status) {
    case AtlStatus.FILER:
      return rateSet.filer;
    case AtlStatus.LATE_FILER:
      return rateSet.lateFiler;
    case AtlStatus.NON_FILER:
      return rateSet.nonFiler;
    default:
      throw new InvalidTaxInputError(
        `Unknown ATL status: ${String(status)}`,
        "atlStatus",
      );
  }
}

/**
 * Applies a decimal-string rate to a whole-rupee amount and returns whole
 * rupees, rounded half-up. Uses `BigInt` integer arithmetic so the result is
 * exact and deterministic — never subject to binary floating-point drift,
 * which matters for amounts that must reconcile to the rupee.
 */
function applyRate(amountRupees: number, rate: DecimalString): number {
  const [integerDigits, fractionDigits = ""] = (rate as string).split(".");
  const denominator = 10n ** BigInt(fractionDigits.length);
  const scaledRate = BigInt(`${integerDigits}${fractionDigits}`);
  const numerator = BigInt(amountRupees) * scaledRate;
  const roundedHalfUp = (numerator + denominator / 2n) / denominator;
  return Number(roundedHalfUp);
}

/** Formats a decimal-string rate as a human-readable percentage for display. */
function formatPercent(rate: DecimalString): string {
  return `${Number(rate) * 100}%`;
}
