import {
  TrustScoreComponentKey,
  trustScoreInputsSchema,
  trustScoreResultSchema,
  trustScoreWeightsSchema,
  type TrustScoreComponent,
  type TrustScoreInputs,
  type TrustScoreResult,
  type TrustScoreWeights,
} from "@sectoria/types";
import {
  DEFAULT_WEIGHTS,
  MIN_VERIFIED_TRANSACTION_WEIGHT,
  TOTAL_WEIGHT,
  VERIFIED_TRANSACTION_SATURATION_COUNT,
} from "./default-weights.js";
import {
  InvalidTrustScoreInputError,
  InvalidTrustScoreWeightsError,
} from "./errors.js";

/** Sums to compare against `TOTAL_WEIGHT` tolerate floating-point custom weights. */
const WEIGHT_SUM_EPSILON = 1e-9;

/**
 * Computes a 0–100 trust score for a dealer or society profile from a set of
 * framework-free inputs.
 *
 * Each input is normalized to a 0–1 factor and multiplied by its component
 * weight; the weighted contributions sum to the final score. With the default
 * weights the split is:
 *
 * - 50% — verified completed transactions (PLRA-reported transfers)
 * - 20% — average post-transaction buyer rating
 * - 15% — response-time percentile
 * - 10% — license/verification completeness (DNFBP, LOP, NOC)
 * -  5% — dispute-resolution history
 *
 * The verified-transaction weight is required to be at least
 * {@link MIN_VERIFIED_TRANSACTION_WEIGHT} (50). Because a profile with zero
 * completed transfers contributes `0` from that dominant component, its score
 * is mathematically capped at `TOTAL_WEIGHT − verifiedTransactionsWeight`
 * (≤ 50/100) regardless of how strong every other input is — the anti-gaming
 * guarantee the score exists to provide. See `domain-logic.mdc`.
 *
 * Pure function: no I/O, no persistence, no framework code, no clock or RNG.
 * Given the same inputs and weights it always returns the same result.
 *
 * @param inputs - The profile's raw scoring inputs.
 * @param weights - Component weights; defaults to {@link DEFAULT_WEIGHTS}.
 * @returns A schema-validated {@link TrustScoreResult} with a per-component breakdown.
 * @throws {InvalidTrustScoreInputError} if `inputs` is null/undefined or invalid.
 * @throws {InvalidTrustScoreWeightsError} if `weights` is invalid, does not sum
 *   to 100, or violates the verified-transaction weight floor.
 */
export function calculateTrustScore(
  inputs: TrustScoreInputs,
  weights: TrustScoreWeights = DEFAULT_WEIGHTS,
): TrustScoreResult {
  if (inputs === null || inputs === undefined) {
    throw new InvalidTrustScoreInputError(
      "Trust score inputs are required, but received null or undefined.",
    );
  }

  const parsedWeights = parseWeights(weights);
  const parsedInputs = parseInputs(inputs);

  const breakdown: TrustScoreComponent[] = [
    component(
      TrustScoreComponentKey.VERIFIED_TRANSACTIONS,
      parsedWeights.verifiedTransactions,
      verifiedTransactionsFactor(parsedInputs.verifiedTransactionCount),
    ),
    component(
      TrustScoreComponentKey.BUYER_RATING,
      parsedWeights.buyerRating,
      buyerRatingFactor(parsedInputs.averageBuyerRating),
    ),
    component(
      TrustScoreComponentKey.RESPONSE_TIME,
      parsedWeights.responseTime,
      parsedInputs.responseTimePercentile / 100,
    ),
    component(
      TrustScoreComponentKey.VERIFICATION_COMPLETENESS,
      parsedWeights.verificationCompleteness,
      parsedInputs.verificationCompleteness,
    ),
    component(
      TrustScoreComponentKey.DISPUTE_RESOLUTION,
      parsedWeights.disputeResolution,
      disputeResolutionFactor(parsedInputs.disputes),
    ),
  ];

  const rawScore = breakdown.reduce((sum, line) => sum + line.contribution, 0);
  const score = Math.round(rawScore);

  return trustScoreResultSchema.parse({ score, breakdown });
}

/**
 * Linearly scales the verified-transaction count to 0–1, saturating at
 * {@link VERIFIED_TRANSACTION_SATURATION_COUNT}. A count of zero yields `0` —
 * the property that, combined with the weight floor, caps an unproven profile.
 */
function verifiedTransactionsFactor(count: number): number {
  return Math.min(count / VERIFIED_TRANSACTION_SATURATION_COUNT, 1);
}

/**
 * Maps an average rating onto 0–1 over the 1–5 review scale (1 star → `0`,
 * 5 stars → `1`). A `null` average (no eligible reviews) earns `0` — absence of
 * reviews is treated as no credit, not as a perfect or worst score.
 */
function buyerRatingFactor(averageBuyerRating: number | null): number {
  if (averageBuyerRating === null) return 0;
  return (averageBuyerRating - 1) / 4;
}

/**
 * Rewards a clean or well-resolved dispute history. No disputes at all earns
 * full marks (`1`); otherwise the factor is the resolved share, so unresolved
 * disputes pull it toward `0`.
 */
function disputeResolutionFactor(disputes: {
  resolved: number;
  unresolved: number;
}): number {
  const total = disputes.resolved + disputes.unresolved;
  if (total === 0) return 1;
  return disputes.resolved / total;
}

/** Builds one breakdown line, computing `contribution = weight × normalizedValue`. */
function component(
  key: TrustScoreComponentKey,
  weight: number,
  normalizedValue: number,
): TrustScoreComponent {
  return {
    component: key,
    weight,
    normalizedValue,
    contribution: weight * normalizedValue,
  };
}

/**
 * Validates the weight configuration: shape, that it sums to {@link TOTAL_WEIGHT},
 * and that the verified-transaction weight meets the anti-gaming floor.
 */
function parseWeights(weights: TrustScoreWeights): TrustScoreWeights {
  const result = trustScoreWeightsSchema.safeParse(weights);
  if (!result.success) {
    throw new InvalidTrustScoreWeightsError(
      `Trust score weights are malformed: ${result.error.message}`,
    );
  }
  const parsed = result.data;

  const total =
    parsed.verifiedTransactions +
    parsed.buyerRating +
    parsed.responseTime +
    parsed.verificationCompleteness +
    parsed.disputeResolution;
  if (Math.abs(total - TOTAL_WEIGHT) > WEIGHT_SUM_EPSILON) {
    throw new InvalidTrustScoreWeightsError(
      `Trust score weights must sum to ${TOTAL_WEIGHT}, but sum to ${total}.`,
    );
  }

  if (parsed.verifiedTransactions < MIN_VERIFIED_TRANSACTION_WEIGHT) {
    throw new InvalidTrustScoreWeightsError(
      `The verified-transaction weight must be at least ${MIN_VERIFIED_TRANSACTION_WEIGHT} ` +
        `to preserve the anti-gaming guarantee, but was ${parsed.verifiedTransactions}.`,
    );
  }

  return parsed;
}

/** Validates the raw inputs, wrapping any schema failure as a typed domain error. */
function parseInputs(inputs: TrustScoreInputs): TrustScoreInputs {
  const result = trustScoreInputsSchema.safeParse(inputs);
  if (!result.success) {
    throw new InvalidTrustScoreInputError(
      `Trust score inputs failed validation: ${result.error.message}`,
    );
  }
  return result.data;
}
