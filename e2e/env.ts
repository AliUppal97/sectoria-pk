/**
 * Environment overrides for Playwright E2E runs. Verification adapter keys are
 * always blank so CI and local E2E exercise mock adapters only (testing.mdc).
 * Database credentials come from the developer's `.env` / CI workflow env —
 * this helper never invents a DATABASE_URL.
 */
export function withE2eEnv(
  extra: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: "development",
    E2E_TEST: process.env.E2E_TEST ?? "",
    NADRA_API_URL: "",
    NADRA_API_KEY: "",
    FBR_ATL_API_URL: "",
    FBR_ATL_API_KEY: "",
    DNFBP_API_URL: "",
    DNFBP_API_KEY: "",
    PLRA_API_URL: "",
    PLRA_API_KEY: "",
    ...extra,
  };
}

/** Test-only encryption key — matches packages/database encryption tests. */
export const FALLBACK_ENCRYPTION_KEY =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
