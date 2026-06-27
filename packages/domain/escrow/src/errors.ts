import type { EscrowAction, EscrowState } from "@sectoria/types";

/**
 * Error types for the escrow state machine. Domain functions throw these typed
 * errors (never a bare `Error`) so callers — and tests — can distinguish an
 * illegal transition request from a programming bug, and so an API layer can
 * map them to a stable error code. See `domain-logic.mdc`: an invalid escrow
 * transition must throw a descriptive, typed error, never silently no-op.
 */

/**
 * Thrown when a caller asks the escrow machine to apply an {@link EscrowAction}
 * that is not a legal transition out of the current {@link EscrowState} (or when
 * the supplied state/action is not a recognised enum value at all).
 *
 * Carries the offending `fromState` and `attemptedAction` so a caller can
 * surface a precise message and an audit log can record exactly what was
 * rejected — never a generic, contextless failure.
 */
export class InvalidEscrowTransitionError extends Error {
  /**
   * @param message - Human-readable explanation of why the transition is illegal.
   * @param fromState - The state the booking was in when the transition was attempted.
   * @param attemptedAction - The action the caller tried to apply.
   */
  constructor(
    message: string,
    public readonly fromState: EscrowState,
    public readonly attemptedAction: EscrowAction,
  ) {
    super(message);
    this.name = "InvalidEscrowTransitionError";
    // Restore prototype chain so `instanceof` works after transpilation to ES5
    // targets; harmless on ES2022 and keeps the typed-error contract reliable.
    Object.setPrototypeOf(this, InvalidEscrowTransitionError.prototype);
  }
}
