import type { AtlStatusResult } from "@sectoria/types";
import { VerificationAdapterNotImplementedError } from "../errors.js";
import type { FbrAtlAdapter } from "./interface.js";

/** Credentials a real FBR ATL integration needs. Both fields are required. */
export interface RealFbrAtlAdapterConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

/**
 * Real FBR ATL adapter — a stub until the production integration is wired. The
 * factory only instantiates this when both `FBR_ATL_API_URL` and
 * `FBR_ATL_API_KEY` are set. See
 * `docs/runbooks/swapping-verification-adapters.md`.
 */
export class RealFbrAtlAdapter implements FbrAtlAdapter {
  constructor(private readonly config: RealFbrAtlAdapterConfig) {}

  async getAtlStatus(_cnic: string, _ntn?: string): Promise<AtlStatusResult> {
    void this.config;
    throw new VerificationAdapterNotImplementedError("FBR ATL", "getAtlStatus");
  }
}
