import {
  dnfbpVerificationResultSchema,
  type DnfbpVerificationResult,
  type IsoDateTime,
} from "@sectoria/types";
import { InvalidVerificationInputError } from "../errors.js";
import {
  pickIndex,
  resolveMockOptions,
  simulateLatency,
  type MockAdapterOptions,
  type ResolvedMockOptions,
} from "../mock-support.js";
import type { DnfbpVerificationAdapter } from "./interface.js";

/** Realistic Pakistani real-estate agency names, keyed by certificate number. */
const DEMO_AGENCIES: readonly string[] = [
  "Sapphire Estates (Pvt) Ltd",
  "Gulberg Property Advisors",
  "DHA Realtors & Marketing",
  "Bahria Town Associates",
  "Capital Smart Properties",
];

/** A certificate is valid for this many years from the check date in the mock. */
const MOCK_VALIDITY_YEARS = 2;

/**
 * Mock DNFBP adapter returning schema-valid certificate checks with simulated
 * latency. Output is deterministic per certificate number. Mock certificates
 * always verify and carry an expiry two years out from the (injected) clock.
 */
export class MockDnfbpAdapter implements DnfbpVerificationAdapter {
  private readonly options: ResolvedMockOptions;

  constructor(options: MockAdapterOptions = {}) {
    this.options = resolveMockOptions(options);
  }

  async verifyDnfbpCertificate(
    certNumber: string,
  ): Promise<DnfbpVerificationResult> {
    const trimmed = certNumber.trim();
    if (trimmed.length === 0) {
      throw new InvalidVerificationInputError(
        "DNFBP verifyDnfbpCertificate requires a non-empty certificate number.",
      );
    }

    await simulateLatency(this.options);

    const rejected = trimmed.toUpperCase().startsWith("REJECT-");
    const agencyName = DEMO_AGENCIES[pickIndex(trimmed, DEMO_AGENCIES.length)]!;

    const now = this.options.now();
    const expiresAt = new Date(now);
    expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + MOCK_VALIDITY_YEARS);

    const result: DnfbpVerificationResult = {
      certNumber: trimmed,
      verified: !rejected,
      agencyName,
      expiresAt: expiresAt.toISOString() as IsoDateTime,
      checkedAt: now.toISOString() as IsoDateTime,
    };

    return dnfbpVerificationResultSchema.parse(result);
  }
}
