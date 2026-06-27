/**
 * `@sectoria/domain-trust-score` — dealer/society trust scoring.
 *
 * Pure, framework-free business logic: {@link calculateTrustScore} turns a set
 * of profile inputs into a 0–100 score with a per-component breakdown, with
 * zero dependencies on Next.js, Prisma, or React. Verified completed
 * transactions deliberately carry at least half the score, so a profile with
 * no completed transfers is mathematically capped at ≤ 50/100 no matter how
 * strong its other signals are — the anti-gaming guarantee the score exists
 * for. Invalid inputs or weights throw typed errors rather than returning a
 * misleading zero. Import everything from this barrel, not individual files.
 */
export { calculateTrustScore } from "./calculate-trust-score.js";
export {
  DEFAULT_WEIGHTS,
  MIN_VERIFIED_TRANSACTION_WEIGHT,
  TOTAL_WEIGHT,
  VERIFIED_TRANSACTION_SATURATION_COUNT,
} from "./default-weights.js";
export {
  InvalidTrustScoreInputError,
  InvalidTrustScoreWeightsError,
} from "./errors.js";
