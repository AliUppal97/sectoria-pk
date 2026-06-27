import { z } from "zod";

/**
 * Shared data contracts for the dealer/society trust score. The scoring
 * *logic* lives in `packages/domain/trust-score`; this file defines only the
 * shapes that cross package boundaries and get persisted.
 *
 * Domain vocabulary used here:
 * - `plra` — Punjab Land Records Authority; the authoritative source for a
 *   *verified* completed property transfer. This count is the anti-gaming
 *   anchor of the score and deliberately dominates the weighting.
 * - `dnfbp` — Designated Non-Financial Business or Profession registration.
 * - `lop` / `noc` — Layout Plan / No-Objection Certificate (society licensing).
 */

/**
 * Raw, framework-free inputs to the trust score. Each value is supplied in its
 * natural unit; the domain normalizes it to a 0–1 factor before weighting, so
 * the caller never has to pre-scale anything.
 */
export const trustScoreInputsSchema = z.object({
  /**
   * Count of PLRA-verified completed transfers attributed to this profile.
   * Zero here can never be compensated for by other inputs — see
   * `packages/domain/trust-score` and `domain-logic.mdc`.
   */
  verifiedTransactionCount: z.number().int().nonnegative(),
  /**
   * Mean rating (1–5) from post-transaction reviews, or `null` when the
   * profile has no eligible reviews yet. `null` earns no rating credit rather
   * than being treated as a zero-star average.
   */
  averageBuyerRating: z.number().min(1).max(5).nullable(),
  /** Where this profile's response speed ranks among peers, as a 0–100 percentile. */
  responseTimePercentile: z.number().min(0).max(100),
  /**
   * Fraction (0–1) of the profile's required licenses that are verified
   * (DNFBP for dealers; LOP/NOC for societies). `1` means fully verified.
   */
  verificationCompleteness: z.number().min(0).max(1),
  /**
   * Lifetime dispute counts. A clean record (no disputes) earns full marks;
   * unresolved disputes drag the dispute component down.
   */
  disputes: z.object({
    resolved: z.number().int().nonnegative(),
    unresolved: z.number().int().nonnegative(),
  }),
});
export type TrustScoreInputs = z.infer<typeof trustScoreInputsSchema>;

/**
 * The percentage weight assigned to each scoring component. Weights are
 * expressed on a 0–100 scale and must sum to exactly 100. The
 * `verifiedTransactions` weight must be at least 50 — the domain enforces this
 * so the score can never be gamed by engagement metrics alone.
 */
export const trustScoreWeightsSchema = z.object({
  verifiedTransactions: z.number().nonnegative(),
  buyerRating: z.number().nonnegative(),
  responseTime: z.number().nonnegative(),
  verificationCompleteness: z.number().nonnegative(),
  disputeResolution: z.number().nonnegative(),
});
export type TrustScoreWeights = z.infer<typeof trustScoreWeightsSchema>;

/**
 * Stable identifiers for each scoring component, used as the `component` key in
 * a {@link TrustScoreComponent} breakdown line.
 */
export const TrustScoreComponentKey = {
  VERIFIED_TRANSACTIONS: "verifiedTransactions",
  BUYER_RATING: "buyerRating",
  RESPONSE_TIME: "responseTime",
  VERIFICATION_COMPLETENESS: "verificationCompleteness",
  DISPUTE_RESOLUTION: "disputeResolution",
} as const;
export type TrustScoreComponentKey =
  (typeof TrustScoreComponentKey)[keyof typeof TrustScoreComponentKey];
export const trustScoreComponentKeySchema = z.nativeEnum(TrustScoreComponentKey);

/**
 * One line of the score breakdown: a component, the weight it carries, the
 * normalized 0–1 performance for that component, and the resulting
 * contribution to the final score. The breakdown makes the score explainable
 * (e.g. for a dealer-facing "how is my score calculated" view).
 */
export const trustScoreComponentSchema = z.object({
  component: trustScoreComponentKeySchema,
  weight: z.number().nonnegative(),
  /** The component's normalized 0–1 performance, before weighting. */
  normalizedValue: z.number().min(0).max(1),
  /** `weight × normalizedValue` — this component's contribution to the score. */
  contribution: z.number().nonnegative(),
});
export type TrustScoreComponent = z.infer<typeof trustScoreComponentSchema>;

/**
 * The result of a trust-score calculation: the final 0–100 score plus a
 * per-component breakdown that always sums (within rounding) to the score.
 */
export const trustScoreResultSchema = z.object({
  /** Final trust score on a 0–100 scale, rounded to a whole number. */
  score: z.number().min(0).max(100),
  breakdown: z.array(trustScoreComponentSchema),
});
export type TrustScoreResult = z.infer<typeof trustScoreResultSchema>;
