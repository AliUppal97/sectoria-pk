import type { DnfbpVerificationResult } from "@sectoria/types";

/**
 * Contract for a DNFBP (Designated Non-Financial Business or Profession)
 * certificate spot-check — the AML/CFT registration a property dealer must hold.
 * Used to verify a dealer's compliance status before authorising them.
 */
export interface DnfbpVerificationAdapter {
  /**
   * Spot-checks a dealer's DNFBP certificate number against the registry.
   *
   * @param certNumber - The certificate number printed on the dealer's DNFBP registration.
   * @returns A schema-valid {@link DnfbpVerificationResult}.
   * @throws {InvalidVerificationInputError} if `certNumber` is empty.
   * @throws {VerificationTimeoutError} if the source could not be reached in time.
   */
  verifyDnfbpCertificate(certNumber: string): Promise<DnfbpVerificationResult>;
}
