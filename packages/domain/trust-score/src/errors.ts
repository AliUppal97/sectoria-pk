/**
 * Typed errors for the trust-score domain. The scorer throws these (never a
 * bare `Error`) so callers and tests can distinguish a malformed request from a
 * programming bug, and so an API layer can map them to stable error codes. See
 * `domain-logic.mdc`: invalid input must throw a descriptive, typed error —
 * never silently return `0` or `null`.
 */

/**
 * Thrown when the inputs to {@link calculateTrustScore} are missing
 * (`null`/`undefined`) or fail schema validation (e.g. a negative transaction
 * count, a rating outside 1–5). A zero score is a legitimate result for a valid
 * profile, so we must never let bad input masquerade as one.
 */
export class InvalidTrustScoreInputError extends Error {
  /** @param message - A description of why the inputs were rejected. */
  constructor(message: string) {
    super(message);
    this.name = "InvalidTrustScoreInputError";
    // Restore the prototype chain so `instanceof` works after transpilation,
    // keeping the typed-error contract reliable for callers and tests.
    Object.setPrototypeOf(this, InvalidTrustScoreInputError.prototype);
  }
}

/**
 * Thrown when a {@link TrustScoreWeights} configuration is invalid: the five
 * weights do not sum to 100, or the verified-transaction weight is below the
 * mandatory 50% floor. The floor is the core anti-gaming guarantee — a weight
 * set that violates it would let engagement metrics alone produce a high score,
 * so it is rejected loudly rather than silently honored.
 */
export class InvalidTrustScoreWeightsError extends Error {
  /** @param message - A description of why the weights were rejected. */
  constructor(message: string) {
    super(message);
    this.name = "InvalidTrustScoreWeightsError";
    Object.setPrototypeOf(this, InvalidTrustScoreWeightsError.prototype);
  }
}
