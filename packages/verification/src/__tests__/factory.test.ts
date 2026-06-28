import { describe, expect, it } from "vitest";
import { createVerificationAdapters } from "../factory.js";
import { resolveAdapterModes } from "../config.js";
import { VerificationConfigError } from "../errors.js";
import { MockNadraAdapter } from "../nadra/mock-adapter.js";
import { RealNadraAdapter } from "../nadra/real-adapter.js";
import { MockFbrAtlAdapter } from "../fbr-atl/mock-adapter.js";
import { MockDnfbpAdapter } from "../dnfbp/mock-adapter.js";
import { MockPlraAdapter } from "../plra/mock-adapter.js";
import { RealFbrAtlAdapter } from "../fbr-atl/real-adapter.js";

/** Mock tuning so any mock the factory builds resolves instantly in tests. */
const FAST_MOCK = { minLatencyMs: 0, maxLatencyMs: 0 } as const;

describe("createVerificationAdapters — blank env yields mocks", () => {
  it("returns mock implementations for every adapter when env is empty", () => {
    const adapters = createVerificationAdapters({ env: {}, mock: FAST_MOCK });

    expect(adapters.nadra).toBeInstanceOf(MockNadraAdapter);
    expect(adapters.fbrAtl).toBeInstanceOf(MockFbrAtlAdapter);
    expect(adapters.dnfbp).toBeInstanceOf(MockDnfbpAdapter);
    expect(adapters.plra).toBeInstanceOf(MockPlraAdapter);
  });

  it("treats blank/whitespace credentials as absent (still mock)", () => {
    const adapters = createVerificationAdapters({
      env: { NADRA_API_URL: "  ", NADRA_API_KEY: "" },
      mock: FAST_MOCK,
    });
    expect(adapters.nadra).toBeInstanceOf(MockNadraAdapter);
  });

  it("produces working mock adapters from the factory", async () => {
    const adapters = createVerificationAdapters({ env: {}, mock: FAST_MOCK });
    const result = await adapters.nadra.verifyCnic("35202-1234567-1");
    expect(result.verified).toBe(true);
  });
});

describe("createVerificationAdapters — real adapters when configured", () => {
  it("returns a real adapter for an integration with both URL and key", () => {
    const adapters = createVerificationAdapters({
      env: {
        NADRA_API_URL: "https://api.nadra.gov.pk",
        NADRA_API_KEY: "secret-key",
      },
      mock: FAST_MOCK,
    });

    expect(adapters.nadra).toBeInstanceOf(RealNadraAdapter);
    // Other integrations stay mock when their creds are absent.
    expect(adapters.fbrAtl).toBeInstanceOf(MockFbrAtlAdapter);
  });

  it("switches each integration independently", () => {
    const adapters = createVerificationAdapters({
      env: {
        FBR_ATL_API_URL: "https://api.fbr.gov.pk",
        FBR_ATL_API_KEY: "fbr-key",
      },
      mock: FAST_MOCK,
    });

    expect(adapters.fbrAtl).toBeInstanceOf(RealFbrAtlAdapter);
    expect(adapters.nadra).toBeInstanceOf(MockNadraAdapter);
  });
});

describe("createVerificationAdapters — partial config fails loudly", () => {
  it("throws VerificationConfigError when only the URL is set", () => {
    expect(() =>
      createVerificationAdapters({
        env: { DNFBP_API_URL: "https://api.dnfbp.gov.pk" },
        mock: FAST_MOCK,
      }),
    ).toThrow(VerificationConfigError);
  });

  it("throws VerificationConfigError when only the key is set", () => {
    expect(() =>
      createVerificationAdapters({
        env: { PLRA_API_KEY: "plra-key" },
        mock: FAST_MOCK,
      }),
    ).toThrow(VerificationConfigError);
  });
});

describe("resolveAdapterModes", () => {
  it("reports mock mode for every adapter on empty env", () => {
    const modes = resolveAdapterModes({});
    expect(modes.nadra.mode).toBe("mock");
    expect(modes.fbrAtl.mode).toBe("mock");
    expect(modes.dnfbp.mode).toBe("mock");
    expect(modes.plra.mode).toBe("mock");
  });

  it("carries resolved credentials in real mode", () => {
    const modes = resolveAdapterModes({
      PLRA_API_URL: "https://api.plra.gov.pk",
      PLRA_API_KEY: "plra-key",
    });
    expect(modes.plra).toEqual({
      mode: "real",
      credentials: {
        baseUrl: "https://api.plra.gov.pk",
        apiKey: "plra-key",
      },
    });
  });
});
