import { pkrAmountSchema, type PkrAmount } from "@sectoria/types";

export interface QuoteMarginInput {
  readonly dealerNetPkr: PkrAmount;
  readonly quotedPricePkr: PkrAmount;
}

export interface QuoteMarginResult {
  readonly spreadPkr: PkrAmount;
}

/**
 * Computes Sectoria's margin on a quote. Spread must be non-negative —
 * a quote below dealer net is rejected at the procedure layer.
 */
export function calculateQuoteMargin(input: QuoteMarginInput): QuoteMarginResult {
  const dealerNet = pkrAmountSchema.parse(input.dealerNetPkr);
  const quoted = pkrAmountSchema.parse(input.quotedPricePkr);
  if (quoted < dealerNet) {
    throw new Error("Quoted price cannot be below dealer net.");
  }
  return { spreadPkr: pkrAmountSchema.parse(quoted - dealerNet) };
}
