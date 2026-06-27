/**
 * `@sectoria/domain-tax` — the FBR property-transfer tax engine.
 *
 * Pure, framework-free business logic: it takes plain data in and returns a
 * plain {@link TaxBreakdown} out, with zero dependencies on Next.js, Prisma,
 * or React. All rates are sourced from a versioned, fiscal-year-keyed table.
 * Import everything from this barrel, not from individual files.
 */
export { calculateTransferTax } from "./calculate-transfer-tax.js";
export {
  CURRENT_FISCAL_YEAR_RATES,
  FISCAL_YEAR_2025_26_RATES,
  TAX_RATE_TABLE_HISTORY,
} from "./tax-rate-table.js";
export { InvalidTaxInputError } from "./errors.js";
