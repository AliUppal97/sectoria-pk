/**
 * Typed error for the ledger domain. The builder throws this (never a bare
 * `Error`) so callers and tests can distinguish a malformed audit request from
 * a programming bug, and so an API layer can map it to a stable error code. See
 * `domain-logic.mdc`: invalid input must throw a descriptive, typed error —
 * never silently return a partial or empty event.
 */

/**
 * Thrown when the input to {@link createLedgerEvent} is missing
 * (`null`/`undefined`) or fails schema validation — e.g. an empty `entityId`, a
 * `type` outside the known {@link LedgerEventType} set, or a `createdAt` that is
 * not a valid ISO 8601 timestamp. An audit record that cannot be trusted to be
 * well-formed is worse than no record, so a bad request is rejected loudly.
 */
export class InvalidLedgerEventError extends Error {
  /** @param message - A description of why the ledger event was rejected. */
  constructor(message: string) {
    super(message);
    this.name = "InvalidLedgerEventError";
    // Restore the prototype chain so `instanceof` works after transpilation,
    // keeping the typed-error contract reliable for callers and tests.
    Object.setPrototypeOf(this, InvalidLedgerEventError.prototype);
  }
}
