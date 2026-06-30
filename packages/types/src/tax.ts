import { z } from "zod";
import { decimalStringSchema, pkrAmountSchema } from "./common.js";
import { atlStatusSchema } from "./user.js";
import { plotTypeSchema } from "./inventory-category.js";

/**
 * Inputs to a property-transfer tax calculation. Amounts are whole-rupee
 * integers (`PkrAmount`); the engine taxes whichever of `salePrice` and
 * `fbrTableValue` is higher, per FBR rules. ATL statuses determine the
 * advance-tax rate for each party.
 *
 * @see Section 236C — advance tax on sale/transfer of immovable property
 * @see Section 236K — advance tax on purchase of immovable property
 * @see Section 7E   — tax on deemed income from immovable property
 */
export const taxCalculationInputSchema = z.object({
  salePrice: pkrAmountSchema,
  fbrTableValue: pkrAmountSchema,
  sellerAtlStatus: atlStatusSchema,
  buyerAtlStatus: atlStatusSchema,
  plotType: plotTypeSchema,
});
export type TaxCalculationInput = z.infer<typeof taxCalculationInputSchema>;

/** A single named charge within a tax breakdown, for itemized display. */
export const lineItemSchema = z.object({
  label: z.string().min(1),
  amount: pkrAmountSchema,
  description: z.string().optional(),
});
export type LineItem = z.infer<typeof lineItemSchema>;

/** The full computed tax/fee breakdown for a transfer. */
export const taxBreakdownSchema = z.object({
  section236C: pkrAmountSchema,
  section236K: pkrAmountSchema,
  section7E: pkrAmountSchema,
  stampDuty: pkrAmountSchema,
  regulatoryFee: pkrAmountSchema,
  total: pkrAmountSchema,
  breakdown: z.array(lineItemSchema),
});
export type TaxBreakdown = z.infer<typeof taxBreakdownSchema>;

/**
 * Advance-tax rates keyed by the payer's ATL status. Rates are decimal
 * strings (e.g. `"0.03"` for 3%) so the exact statutory fraction is
 * preserved — never a binary float.
 */
export const atlRateSetSchema = z.object({
  filer: decimalStringSchema,
  lateFiler: decimalStringSchema,
  nonFiler: decimalStringSchema,
});
export type AtlRateSet = z.infer<typeof atlRateSetSchema>;

/**
 * A versioned tax-rate table. The `fiscalYear` field lives inside the data
 * (not just a filename) so a rate change is a new table entry rather than
 * a code change, and a mis-copied file fails loudly. See
 * `json-and-config-conventions.mdc`.
 */
export const taxRateTableSchema = z.object({
  /** Fiscal year the rates apply to, e.g. "2025-26". */
  fiscalYear: z.string().regex(/^\d{4}-\d{2}$/, "Use the form YYYY-YY"),
  section236C: atlRateSetSchema,
  section236K: atlRateSetSchema,
  /** Stamp duty as a single decimal-string rate (e.g. "0.02"). */
  stampDuty: decimalStringSchema,
  /**
   * Provincial/authority regulatory (registration/transfer) fee as a single
   * decimal-string rate (e.g. "0.01"). Carried in the versioned table — like
   * every other rate — so a fee change is a config edit, never a literal
   * baked into the calculation. Surfaces as `TaxBreakdown.regulatoryFee`.
   */
  regulatoryFee: decimalStringSchema,
  /** Section 7E only applies above this property value (whole rupees). */
  section7eThreshold: pkrAmountSchema,
  section7eRate: decimalStringSchema,
});
export type TaxRateTable = z.infer<typeof taxRateTableSchema>;

/**
 * FBR notified valuation for a single zone, in whole rupees **per square foot**,
 * split by plot type. The FBR publishes a value per area/zone that sets the
 * floor a transfer is taxed on — the engine taxes `max(salePrice, fbrTableValue)`,
 * so this is never used to *raise* tax beyond a genuine sale price, only to stop
 * an under-declared one from lowering it.
 */
export const fbrZoneValuationSchema = z.object({
  /** Notified per-sqft value for residential plots (whole rupees). */
  residentialPerSqft: pkrAmountSchema,
  /** Notified per-sqft value for commercial plots (whole rupees). */
  commercialPerSqft: pkrAmountSchema,
});
export type FbrZoneValuation = z.infer<typeof fbrZoneValuationSchema>;

/**
 * A versioned FBR valuation table: the notified per-sqft value for each
 * valuation zone, keyed by `InventoryCategory.fbrValuationZone`. Versioned by
 * fiscal year for the same reason as {@link taxRateTableSchema} — a new FBR
 * notification is a new table entry, never an edited literal inside the engine.
 * See `json-and-config-conventions.mdc`.
 */
export const fbrValuationTableSchema = z.object({
  /** Fiscal year the valuation applies to, e.g. "2025-26". */
  fiscalYear: z.string().regex(/^\d{4}-\d{2}$/, "Use the form YYYY-YY"),
  /** Zone key (matching `InventoryCategory.fbrValuationZone`) → per-sqft values. */
  zones: z.record(z.string().min(1), fbrZoneValuationSchema),
});
export type FbrValuationTable = z.infer<typeof fbrValuationTableSchema>;
