import { taxRateTableSchema, type TaxRateTable } from "@sectoria/types";

/**
 * Versioned FBR / provincial rate tables for the property-transfer tax engine.
 *
 * Every rate the engine applies lives here, keyed by fiscal year — a rate or
 * threshold change is a new entry in this file, never a literal edited inside
 * {@link calculateTransferTax}. Each table is run through
 * `taxRateTableSchema.parse` at module load, so a malformed table (bad decimal
 * string, missing field, mis-typed threshold) fails loudly at import time
 * rather than producing a wrong number at runtime. See `domain-logic.mdc` and
 * `json-and-config-conventions.mdc`.
 *
 * NOTE: the specific percentages below are configured for the FY 2025-26
 * baseline of this demo build. They MUST be re-verified against the current
 * Finance Act / FBR valuation notifications before any production use — but a
 * change is a one-line edit to a new table here, with a matching test update.
 */

/** Section 7E exemption threshold: PKR 25,000,000 (whole rupees). */
const SECTION_7E_THRESHOLD_RUPEES = 25_000_000;

/**
 * FY 2025-26 rates.
 *
 * @see Section 236C — advance tax on the seller/transferor of immovable property
 * @see Section 236K — advance tax on the buyer/purchaser of immovable property
 * @see Section 7E   — tax on deemed income from immovable property
 *
 * Advance-tax rates rise with a weaker filing status (filer → late-filer →
 * non-filer) to reflect the statutory non-filer penalty; rates are decimal
 * strings so the exact statutory fraction is preserved, never a binary float.
 */
export const FISCAL_YEAR_2025_26_RATES: TaxRateTable = taxRateTableSchema.parse({
  fiscalYear: "2025-26",
  section236C: {
    filer: "0.03",
    lateFiler: "0.06",
    nonFiler: "0.10",
  },
  section236K: {
    filer: "0.03",
    lateFiler: "0.06",
    nonFiler: "0.12",
  },
  stampDuty: "0.02",
  regulatoryFee: "0.01",
  section7eThreshold: SECTION_7E_THRESHOLD_RUPEES,
  section7eRate: "0.01",
});

/**
 * The rate table {@link calculateTransferTax} uses when no explicit table is
 * passed. Re-point this to the newest fiscal year as part of the same change
 * that adds that year's table (and its tests).
 */
export const CURRENT_FISCAL_YEAR_RATES: TaxRateTable = FISCAL_YEAR_2025_26_RATES;

/**
 * Every rate table the engine knows about, newest first. Kept so historical
 * transfers can be re-priced against the table that was in force at the time —
 * which is what makes a past tax computation independently auditable.
 */
export const TAX_RATE_TABLE_HISTORY: readonly TaxRateTable[] = [
  FISCAL_YEAR_2025_26_RATES,
];
