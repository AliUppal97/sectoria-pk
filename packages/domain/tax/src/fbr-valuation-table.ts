import {
  PlotType,
  fbrValuationTableSchema,
  pkrAmountSchema,
  type FbrValuationTable,
  type PkrAmount,
  type PlotType as PlotTypeValue,
} from "@sectoria/types";

/**
 * Versioned FBR valuation tables — the notified per-square-foot value the FBR
 * sets for each valuation zone.
 *
 * The transfer-tax engine taxes `max(salePrice, fbrTableValue)`, so the FBR
 * table value is the floor that stops an under-declared sale price from lowering
 * tax. That floor is a *government* figure derived from the plot's zone and
 * type — never something a buyer types in — which is why it is resolved here
 * from the category's `fbrValuationZone` rather than trusted from a request.
 *
 * Like the rate table, a change is a new fiscal-year entry validated at import
 * (`fbrValuationTableSchema.parse`), never an edited literal — so a malformed
 * table fails loudly at load. See `domain-logic.mdc` and
 * `json-and-config-conventions.mdc`.
 *
 * NOTE: the per-sqft values below are illustrative FY 2025-26 baselines for this
 * demo build and MUST be replaced with the actual FBR valuation notifications
 * for each real zone before production use — a one-table edit here, with a
 * matching test update.
 *
 * @see FBR valuation of immovable property (Income Tax Ordinance 2001) — the
 *   notified per-zone values that form the taxable floor alongside Section 236C/236K.
 */
export const FISCAL_YEAR_2025_26_FBR_VALUATION: FbrValuationTable =
  fbrValuationTableSchema.parse({
    fiscalYear: "2025-26",
    zones: {
      // Premium / central urban zones.
      "Zone-I": { residentialPerSqft: 12_000, commercialPerSqft: 22_000 },
      // Established mid-tier zones.
      "Zone-II": { residentialPerSqft: 8_000, commercialPerSqft: 15_000 },
      // Developing / peripheral zones.
      "Zone-III": { residentialPerSqft: 5_000, commercialPerSqft: 10_000 },
    },
  });

/**
 * The valuation table {@link lookupFbrValuation} uses when no explicit table is
 * passed. Re-point this to the newest fiscal year as part of the same change
 * that adds that year's table (and its tests).
 */
export const CURRENT_FBR_VALUATION: FbrValuationTable =
  FISCAL_YEAR_2025_26_FBR_VALUATION;

/**
 * Every valuation table the engine knows about, newest first — kept so a past
 * transfer can be re-priced against the valuation in force when it happened.
 */
export const FBR_VALUATION_TABLE_HISTORY: readonly FbrValuationTable[] = [
  FISCAL_YEAR_2025_26_FBR_VALUATION,
];

/**
 * Resolves the FBR table value (whole rupees) for a plot from its valuation
 * zone, plot type, and size.
 *
 * Pure function: no I/O, no clock. Returns `null` — rather than throwing — when
 * the zone is not on the table or the size is not a positive whole number, so
 * callers can fall back deliberately (e.g. to the agreed sale price) instead of
 * failing a booking on a missing valuation entry.
 *
 * @see FBR valuation of immovable property (Income Tax Ordinance 2001) — used as
 *   `max(salePrice, fbrTableValue)` in {@link calculateTransferTax}.
 *
 * @returns The notified value × size in whole rupees, or `null` if no valuation
 *   is on record for the zone.
 */
export function lookupFbrValuation(
  input: { zone: string; plotType: PlotTypeValue; sizeSqft: number },
  table: FbrValuationTable = CURRENT_FBR_VALUATION,
): PkrAmount | null {
  if (!Number.isInteger(input.sizeSqft) || input.sizeSqft <= 0) return null;

  const zone = table.zones[input.zone];
  if (zone === undefined) return null;

  const perSqft =
    input.plotType === PlotType.COMMERCIAL
      ? zone.commercialPerSqft
      : zone.residentialPerSqft;

  return pkrAmountSchema.parse(perSqft * input.sizeSqft);
}
