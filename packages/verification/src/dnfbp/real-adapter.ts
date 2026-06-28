import type { DnfbpVerificationResult } from "@sectoria/types";
import { VerificationAdapterNotImplementedError } from "../errors.js";
import type { DnfbpVerificationAdapter } from "./interface.js";

/** Credentials a real DNFBP integration needs. Both fields are required. */
export interface RealDnfbpAdapterConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

/**
 * Real DNFBP adapter — a stub until the production integration is wired. The
 * factory only instantiates this when both `DNFBP_API_URL` and `DNFBP_API_KEY`
 * are set. See `docs/runbooks/swapping-verification-adapters.md`.
 */
export class RealDnfbpAdapter implements DnfbpVerificationAdapter {
  constructor(private readonly config: RealDnfbpAdapterConfig) {}

  async verifyDnfbpCertificate(
    _certNumber: string,
  ): Promise<DnfbpVerificationResult> {
    void this.config;
    throw new VerificationAdapterNotImplementedError(
      "DNFBP",
      "verifyDnfbpCertificate",
    );
  }
}
