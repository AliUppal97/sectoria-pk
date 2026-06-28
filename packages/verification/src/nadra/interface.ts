import type { NadraVerificationResult } from "@sectoria/types";

/**
 * Contract for a NADRA (National Database and Registration Authority) identity
 * check. The interface is the stable boundary: swapping the mock for the real
 * integration means writing a new class that implements this, and nothing else
 * in the app changes (see `verification-adapters.mdc`).
 */
export interface NadraVerificationAdapter {
  /**
   * Verifies a CNIC and returns the matched identity details plus a biometric
   * match confidence score.
   *
   * @param cnic - A CNIC in canonical hyphenated form, e.g. `35202-1234567-1`.
   * @returns A schema-valid {@link NadraVerificationResult}.
   * @throws {InvalidVerificationInputError} if `cnic` is malformed.
   * @throws {VerificationTimeoutError} if the source could not be reached in time.
   */
  verifyCnic(cnic: string): Promise<NadraVerificationResult>;
}
