/**
 * Typed errors for the balloting domain. The draw throws these (never a bare
 * `Error`) so callers and tests can distinguish a malformed ballot request
 * from a programming bug, and so an API layer can map them to a stable error
 * code. See `domain-logic.mdc`: invalid input must throw a descriptive, typed
 * error — never silently return an empty result.
 */

/**
 * Thrown when a ballot is requested with no entries. A draw over an empty pool
 * has no meaning, so it fails loudly rather than returning an empty result that
 * a caller might mistake for a completed, fair round.
 */
export class EmptyBallotError extends Error {
  constructor(
    message = "Cannot run a ballot with an empty entries array; at least one entry is required.",
  ) {
    super(message);
    this.name = "EmptyBallotError";
    // Restore the prototype chain so `instanceof` works after transpilation,
    // keeping the typed-error contract reliable for callers and tests.
    Object.setPrototypeOf(this, EmptyBallotError.prototype);
  }
}

/**
 * Thrown when the same booking appears more than once in the entry pool. A
 * duplicate would let one booking win twice and silently corrupt the fairness
 * guarantee the ballot exists to provide, so it is rejected up front.
 */
export class DuplicateBallotEntryError extends Error {
  /**
   * @param bookingId - The booking id that appeared more than once.
   * @param message - Optional override for the default descriptive message.
   */
  constructor(
    public readonly bookingId: string,
    message?: string,
  ) {
    super(
      message ??
        `Duplicate ballot entry for bookingId "${bookingId}"; each booking may enter a ballot only once.`,
    );
    this.name = "DuplicateBallotEntryError";
    Object.setPrototypeOf(this, DuplicateBallotEntryError.prototype);
  }
}
