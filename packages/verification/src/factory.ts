import { resolveAdapterModes } from "./config.js";
import type { MockAdapterOptions } from "./mock-support.js";
import type { NadraVerificationAdapter } from "./nadra/interface.js";
import { MockNadraAdapter } from "./nadra/mock-adapter.js";
import { RealNadraAdapter } from "./nadra/real-adapter.js";
import type { FbrAtlAdapter } from "./fbr-atl/interface.js";
import { MockFbrAtlAdapter } from "./fbr-atl/mock-adapter.js";
import { RealFbrAtlAdapter } from "./fbr-atl/real-adapter.js";
import type { DnfbpVerificationAdapter } from "./dnfbp/interface.js";
import { MockDnfbpAdapter } from "./dnfbp/mock-adapter.js";
import { RealDnfbpAdapter } from "./dnfbp/real-adapter.js";
import type { PlraCertificateAdapter } from "./plra/interface.js";
import { MockPlraAdapter } from "./plra/mock-adapter.js";
import { RealPlraAdapter } from "./plra/real-adapter.js";

/** The full set of government-integration adapters the app depends on. */
export interface VerificationAdapters {
  readonly nadra: NadraVerificationAdapter;
  readonly fbrAtl: FbrAtlAdapter;
  readonly dnfbp: DnfbpVerificationAdapter;
  readonly plra: PlraCertificateAdapter;
}

/** Options controlling how {@link createVerificationAdapters} builds the set. */
export interface CreateVerificationAdaptersConfig {
  /**
   * Environment record to read credentials from. Defaults to `process.env`.
   * Per-adapter: both URL + key present → real adapter; both blank → mock; only
   * one present → throws {@link VerificationConfigError}.
   */
  readonly env?: Record<string, string | undefined>;
  /**
   * Options forwarded to any mock adapter that gets created (latency window,
   * injected clock/RNG). Tests pass `{ minLatencyMs: 0, maxLatencyMs: 0 }` to
   * stay fast.
   */
  readonly mock?: MockAdapterOptions;
}

/**
 * Builds the set of verification adapters, choosing mock vs. real per
 * integration based on which credentials are present in the environment.
 *
 * This is the single composition point: nothing else in the codebase decides
 * mock-vs-real. With verification env vars blank (the default in development and
 * tests) every adapter is a mock returning realistic Pakistani demo data.
 *
 * @param config - Environment source and mock tuning. Both optional.
 * @returns The four adapters, ready to use behind their interfaces.
 * @throws {VerificationConfigError} if any integration is partially configured.
 */
export function createVerificationAdapters(
  config: CreateVerificationAdaptersConfig = {},
): VerificationAdapters {
  const modes = resolveAdapterModes(config.env);
  const mockOptions = config.mock;

  return {
    nadra:
      modes.nadra.mode === "real"
        ? new RealNadraAdapter(modes.nadra.credentials)
        : new MockNadraAdapter(mockOptions),
    fbrAtl:
      modes.fbrAtl.mode === "real"
        ? new RealFbrAtlAdapter(modes.fbrAtl.credentials)
        : new MockFbrAtlAdapter(mockOptions),
    dnfbp:
      modes.dnfbp.mode === "real"
        ? new RealDnfbpAdapter(modes.dnfbp.credentials)
        : new MockDnfbpAdapter(mockOptions),
    plra:
      modes.plra.mode === "real"
        ? new RealPlraAdapter(modes.plra.credentials)
        : new MockPlraAdapter(mockOptions),
  };
}
