import type { NadraVerificationResult } from "@sectoria/types";
import { VerificationAdapterNotImplementedError } from "../errors.js";
import type { NadraVerificationAdapter } from "./interface.js";

/** Credentials a real NADRA integration needs. Both fields are required. */
export interface RealNadraAdapterConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
}

/**
 * Real NADRA adapter — a stub until the production integration is wired. The
 * factory only instantiates this when both `NADRA_API_URL` and `NADRA_API_KEY`
 * are set, so calling it today throws {@link VerificationAdapterNotImplementedError}.
 *
 * When implementing: normalise the upstream `snake_case` response to the
 * `camelCase` {@link NadraVerificationResult} shape *inside this file*, parse it
 * with `nadraVerificationResultSchema`, and throw {@link VerificationTimeoutError}
 * on network timeout. Touch nothing outside this file and the factory's
 * branching — see `docs/runbooks/swapping-verification-adapters.md`.
 */
export class RealNadraAdapter implements NadraVerificationAdapter {
  constructor(private readonly config: RealNadraAdapterConfig) {}

  async verifyCnic(_cnic: string): Promise<NadraVerificationResult> {
    void this.config;
    throw new VerificationAdapterNotImplementedError("NADRA", "verifyCnic");
  }
}
