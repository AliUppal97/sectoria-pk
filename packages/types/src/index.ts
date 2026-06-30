/**
 * `@sectoria/types` — the single source of truth for shared data contracts.
 *
 * Every schema is a Zod schema and every exported TypeScript type is
 * derived from it via `z.infer` (enums use the `as const` + derived-union
 * pattern). Nothing here is hand-written to parallel a Zod shape, so types
 * can never drift from the validation that produces them. Import everything
 * from this barrel, not from individual files.
 */
export * from "./common.js";
export * from "./user.js";
export * from "./society.js";
export * from "./society-update.js";
export * from "./inventory-category.js";
export * from "./plot.js";
export * from "./payment-plan.js";
export * from "./escrow.js";
export * from "./ballot.js";
export * from "./allocation.js";
export * from "./trust-score.js";
export * from "./tax.js";
export * from "./booking.js";
export * from "./dealer-profile.js";
export * from "./society-partner-authorization.js";
export * from "./review.js";
export * from "./ledger-event.js";
export * from "./verification.js";
export * from "./lead.js";
export * from "./quote.js";
export * from "./dealer-net-sheet.js";
export * from "./fulfillment-order.js";
export * from "./platform-fee.js";
export * from "./quote-payment.js";
