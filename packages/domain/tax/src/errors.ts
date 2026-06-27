/**
 * Error types for the tax engine. Domain functions throw these typed errors
 * (never a bare `Error`) so callers — and tests — can distinguish a bad input
 * from a programming bug, and so an API layer can map them to a stable error
 * code. See `domain-logic.mdc`: invalid input must throw a descriptive, typed
 * error, never silently return `0`/`null`.
 */

/**
 * Thrown when a tax calculation is asked to run on input that cannot
 * represent a real transfer — a non-positive sale price or FBR table value,
 * or a value that fails the `TaxCalculationInput` schema (e.g. a negative or
 * non-integer paisa amount).
 */
export class InvalidTaxInputError extends Error {
  /**
   * @param message - Human-readable explanation of what was invalid and why.
   * @param field - The offending input field, when a single one is to blame
   *   (e.g. `"salePrice"`), to aid callers surfacing a precise validation message.
   */
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "InvalidTaxInputError";
    // Restore prototype chain so `instanceof` works after transpilation to ES5
    // targets; harmless on ES2022 and keeps the typed-error contract reliable.
    Object.setPrototypeOf(this, InvalidTaxInputError.prototype);
  }
}
