import type { AtlStatusResult } from "@sectoria/types";

/**
 * Contract for an FBR (Federal Board of Revenue) Active Taxpayer List lookup.
 * ATL status drives advance-tax rates in `packages/domain/tax`, so this is a
 * dependency of the booking/tax flow, not just a display concern.
 */
export interface FbrAtlAdapter {
  /**
   * Returns the current Active Taxpayer List status for a taxpayer.
   *
   * @param cnic - A CNIC in canonical hyphenated form, e.g. `35202-1234567-1`.
   * @param ntn - Optional National Tax Number, when known.
   * @returns A schema-valid {@link AtlStatusResult}.
   * @throws {InvalidVerificationInputError} if `cnic`/`ntn` is malformed.
   * @throws {VerificationTimeoutError} if the source could not be reached in time.
   */
  getAtlStatus(cnic: string, ntn?: string): Promise<AtlStatusResult>;
}
