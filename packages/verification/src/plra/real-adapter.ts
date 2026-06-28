import type { PlraCertificate } from "@sectoria/types";
import { VerificationAdapterNotImplementedError } from "../errors.js";
import type { PlraCertificateAdapter, TransferPayload } from "./interface.js";

/** Credentials a real PLRA integration needs. Both fields are required. */
export interface RealPlraAdapterConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

/**
 * Real PLRA adapter — a stub until the production integration is wired. The
 * factory only instantiates this when both `PLRA_API_URL` and `PLRA_API_KEY`
 * are set. See `docs/runbooks/swapping-verification-adapters.md`.
 */
export class RealPlraAdapter implements PlraCertificateAdapter {
  constructor(private readonly config: RealPlraAdapterConfig) {}

  async issueCertificate(
    _transferId: string,
    _payload: TransferPayload,
  ): Promise<PlraCertificate> {
    void this.config;
    throw new VerificationAdapterNotImplementedError("PLRA", "issueCertificate");
  }
}
