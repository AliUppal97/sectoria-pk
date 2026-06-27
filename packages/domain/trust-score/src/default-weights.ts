import { type TrustScoreWeights } from "@sectoria/types";

/**
 * The scale the trust score is expressed on. The component weights sum to this,
 * so a profile that maxes every component scores exactly this value.
 */
export const TOTAL_WEIGHT = 100;

/**
 * The minimum share the verified-transaction component must carry. Enforced by
 * {@link calculateTrustScore} against any supplied weights. Because the
 * verified-transaction factor is `0` for a profile with no completed
 * transfers, this floor guarantees such a profile can never exceed
 * `TOTAL_WEIGHT − MIN_VERIFIED_TRANSACTION_WEIGHT` (≤ 50/100) no matter how
 * strong its other inputs are — the anti-gaming property the score exists for.
 * See `domain-logic.mdc`.
 */
export const MIN_VERIFIED_TRANSACTION_WEIGHT = 50;

/**
 * Number of PLRA-verified completed transfers at which the verified-transaction
 * component reaches full marks (a normalized value of `1`). Below this, the
 * component scales linearly with the count. This is a business parameter, not a
 * legal threshold — tune it here, never inline in the calculation.
 */
export const VERIFIED_TRANSACTION_SATURATION_COUNT = 25;

/**
 * Default 0–100 weighting for {@link calculateTrustScore}.
 *
 * Verified completed transactions deliberately carry half of the entire score
 * so it cannot be gamed by engagement alone — see `domain-logic.mdc`. The five
 * weights sum to exactly {@link TOTAL_WEIGHT}.
 *
 * - 50 — verified completed transactions (PLRA-reported transfers)
 * - 20 — average post-transaction buyer rating
 * - 15 — response-time percentile
 * - 10 — license/verification completeness (DNFBP, LOP, NOC)
 * -  5 — dispute-resolution history
 */
export const DEFAULT_WEIGHTS: TrustScoreWeights = {
  verifiedTransactions: 50,
  buyerRating: 20,
  responseTime: 15,
  verificationCompleteness: 10,
  disputeResolution: 5,
};
