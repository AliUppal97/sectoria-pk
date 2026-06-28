/**
 * Typed errors for the verification adapters. Per `verification-adapters.mdc`,
 * a verification *failure* (the government source says "no") and a verification
 * *timeout* ("we couldn't reach the source right now") are distinct outcomes a
 * caller must handle differently — so they are distinct types here, never a bare
 * `Error`. A denied check is modelled as data (`verified: false`) on the typed
 * result; the classes below cover the exceptional cases.
 */

/**
 * Thrown when input to an adapter is malformed before any network call is made —
 * e.g. a CNIC that does not match the canonical format, or an empty certificate
 * number. This is a caller mistake, not a verification result, so it is surfaced
 * as a thrown error rather than a `verified: false` outcome.
 */
export class InvalidVerificationInputError extends Error {
  /** @param message - A description of which input was rejected and why. */
  constructor(message: string) {
    super(message);
    this.name = "InvalidVerificationInputError";
    Object.setPrototypeOf(this, InvalidVerificationInputError.prototype);
  }
}

/**
 * Thrown when the verification configuration is internally inconsistent — for
 * example, an adapter given an API URL but no API key (or vice versa). Rather
 * than silently falling back to a mock (which could mask a broken production
 * deploy), the factory fails loudly. See `security.mdc`: fail fast on
 * missing/malformed secrets rather than running with undefined values.
 */
export class VerificationConfigError extends Error {
  /** @param message - A description of the configuration problem. */
  constructor(message: string) {
    super(message);
    this.name = "VerificationConfigError";
    Object.setPrototypeOf(this, VerificationConfigError.prototype);
  }
}

/**
 * Thrown by a real adapter implementation that has not been wired up yet. The
 * factory only ever instantiates a real adapter when its credentials are
 * present, so reaching this is a signal that the production integration still
 * needs to be implemented — see
 * `docs/runbooks/swapping-verification-adapters.md`.
 */
export class VerificationAdapterNotImplementedError extends Error {
  /**
   * @param provider - The integration name (e.g. "NADRA", "FBR ATL").
   * @param operation - The adapter method that was called.
   */
  constructor(provider: string, operation: string) {
    super(
      `The real ${provider} adapter is not implemented yet (called "${operation}"). ` +
        `Implement it and follow docs/runbooks/swapping-verification-adapters.md, ` +
        `or unset the ${provider} credentials to use the mock adapter.`,
    );
    this.name = "VerificationAdapterNotImplementedError";
    Object.setPrototypeOf(this, VerificationAdapterNotImplementedError.prototype);
  }
}

/**
 * Thrown when an adapter could not get an answer from the government source in
 * time. Deliberately distinct from a denial: the booking flow must treat
 * "couldn't check right now" (retryable) differently from "checked, and the
 * answer is no" (terminal). Real adapters throw this on network timeout; mock
 * adapters can be configured to simulate it.
 */
export class VerificationTimeoutError extends Error {
  /**
   * @param provider - The integration name that timed out.
   * @param timeoutMs - The timeout budget that was exceeded, in milliseconds.
   */
  constructor(provider: string, timeoutMs: number) {
    super(`${provider} verification timed out after ${timeoutMs}ms.`);
    this.name = "VerificationTimeoutError";
    Object.setPrototypeOf(this, VerificationTimeoutError.prototype);
  }
}
