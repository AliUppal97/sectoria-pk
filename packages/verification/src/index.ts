/**
 * `@sectoria/verification` — typed adapters for the four government
 * integrations Sectoria depends on: NADRA (identity), FBR ATL (taxpayer
 * status), DNFBP (dealer AML/CFT registration), and PLRA (property
 * certificates).
 *
 * Each integration is an **interface + swappable implementation**. A `Mock*`
 * implementation returns schema-valid, realistic Pakistani demo data with
 * simulated network latency; a `Real*` stub awaits the production wiring. The
 * single {@link createVerificationAdapters} factory picks mock vs. real per
 * integration from environment credentials — blank env (the dev/test default)
 * yields all mocks. Never call an adapter from a UI component or page; always go
 * through `packages/api-client` (see `verification-adapters.mdc`).
 *
 * Import everything from this barrel, not individual files.
 */

export {
  createVerificationAdapters,
  type VerificationAdapters,
  type CreateVerificationAdaptersConfig,
} from "./factory.js";

export {
  resolveAdapterModes,
  verificationEnvSchema,
  type VerificationEnv,
  type AdapterKey,
  type AdapterMode,
  type ResolvedCredentials,
} from "./config.js";

export {
  DEFAULT_MIN_LATENCY_MS,
  DEFAULT_MAX_LATENCY_MS,
  type MockAdapterOptions,
} from "./mock-support.js";

export {
  InvalidVerificationInputError,
  VerificationConfigError,
  VerificationAdapterNotImplementedError,
  VerificationTimeoutError,
} from "./errors.js";

// NADRA
export type { NadraVerificationAdapter } from "./nadra/interface.js";
export { MockNadraAdapter } from "./nadra/mock-adapter.js";
export {
  RealNadraAdapter,
  type RealNadraAdapterConfig,
} from "./nadra/real-adapter.js";

// FBR ATL
export type { FbrAtlAdapter } from "./fbr-atl/interface.js";
export { MockFbrAtlAdapter } from "./fbr-atl/mock-adapter.js";
export {
  RealFbrAtlAdapter,
  type RealFbrAtlAdapterConfig,
} from "./fbr-atl/real-adapter.js";

// DNFBP
export type { DnfbpVerificationAdapter } from "./dnfbp/interface.js";
export { MockDnfbpAdapter } from "./dnfbp/mock-adapter.js";
export {
  RealDnfbpAdapter,
  type RealDnfbpAdapterConfig,
} from "./dnfbp/real-adapter.js";

// PLRA
export {
  transferPayloadSchema,
  type PlraCertificateAdapter,
  type TransferPayload,
} from "./plra/interface.js";
export { MockPlraAdapter } from "./plra/mock-adapter.js";
export {
  RealPlraAdapter,
  type RealPlraAdapterConfig,
} from "./plra/real-adapter.js";
