import { z } from "zod";
import { VerificationConfigError } from "./errors.js";

/**
 * Reads which government integrations are configured for *real* use from
 * environment variables, and decides per-adapter whether to return a mock or a
 * real implementation.
 *
 * Rule per `verification-adapters.mdc`: an adapter goes real only when *both*
 * its API URL and API key are present. Blank/absent → mock. Exactly one of the
 * pair present is a misconfiguration and throws (rather than silently falling
 * back to a mock, which could mask a broken production deploy — see
 * `security.mdc`: fail fast on missing/malformed secrets).
 */

/** A credential value: a non-empty string, or undefined if blank/absent. */
const credentialSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().min(1).optional(),
);

/** The raw environment shape this package reads. */
export const verificationEnvSchema = z.object({
  NADRA_API_URL: credentialSchema,
  NADRA_API_KEY: credentialSchema,
  FBR_ATL_API_URL: credentialSchema,
  FBR_ATL_API_KEY: credentialSchema,
  DNFBP_API_URL: credentialSchema,
  DNFBP_API_KEY: credentialSchema,
  PLRA_API_URL: credentialSchema,
  PLRA_API_KEY: credentialSchema,
});
export type VerificationEnv = z.infer<typeof verificationEnvSchema>;

/** The four integrations this package provides. */
export type AdapterKey = "nadra" | "fbrAtl" | "dnfbp" | "plra";

/** Resolved credentials for a single integration that is configured for real use. */
export interface ResolvedCredentials {
  readonly baseUrl: string;
  readonly apiKey: string;
}

/**
 * Per-adapter resolution: either run the mock, or run real with credentials.
 * A discriminated union so the factory can switch exhaustively.
 */
export type AdapterMode =
  | { readonly mode: "mock" }
  | { readonly mode: "real"; readonly credentials: ResolvedCredentials };

const ENV_KEYS: Record<AdapterKey, { url: keyof VerificationEnv; key: keyof VerificationEnv }> = {
  nadra: { url: "NADRA_API_URL", key: "NADRA_API_KEY" },
  fbrAtl: { url: "FBR_ATL_API_URL", key: "FBR_ATL_API_KEY" },
  dnfbp: { url: "DNFBP_API_URL", key: "DNFBP_API_KEY" },
  plra: { url: "PLRA_API_URL", key: "PLRA_API_KEY" },
};

/** Human-readable provider names for error messages. */
const PROVIDER_LABELS: Record<AdapterKey, string> = {
  nadra: "NADRA",
  fbrAtl: "FBR ATL",
  dnfbp: "DNFBP",
  plra: "PLRA",
};

function resolveAdapterMode(
  adapter: AdapterKey,
  env: VerificationEnv,
): AdapterMode {
  const { url: urlKey, key: keyKey } = ENV_KEYS[adapter];
  const baseUrl = env[urlKey];
  const apiKey = env[keyKey];

  if (baseUrl && apiKey) {
    return { mode: "real", credentials: { baseUrl, apiKey } };
  }
  if (baseUrl || apiKey) {
    const present = baseUrl ? String(urlKey) : String(keyKey);
    const missing = baseUrl ? String(keyKey) : String(urlKey);
    throw new VerificationConfigError(
      `${PROVIDER_LABELS[adapter]} is partially configured: ${present} is set but ${missing} is missing. ` +
        `Set both to use the real adapter, or unset both to use the mock.`,
    );
  }
  return { mode: "mock" };
}

/**
 * Parses raw env into a per-adapter mode map. Throws
 * {@link VerificationConfigError} if any adapter is partially configured.
 *
 * @param env - The environment record to read (defaults to `process.env`).
 */
export function resolveAdapterModes(
  env: Record<string, string | undefined> = process.env,
): Record<AdapterKey, AdapterMode> {
  const parsed = verificationEnvSchema.parse(env);
  return {
    nadra: resolveAdapterMode("nadra", parsed),
    fbrAtl: resolveAdapterMode("fbrAtl", parsed),
    dnfbp: resolveAdapterMode("dnfbp", parsed),
    plra: resolveAdapterMode("plra", parsed),
  };
}
