import { describe, expect, it, vi } from "vitest";
import {
  atlStatusResultSchema,
  dnfbpVerificationResultSchema,
  nadraVerificationResultSchema,
  plraCertificateSchema,
  type Cnic,
  type PkrAmount,
} from "@sectoria/types";
import { MockNadraAdapter } from "../nadra/mock-adapter.js";
import { MockFbrAtlAdapter } from "../fbr-atl/mock-adapter.js";
import { MockDnfbpAdapter } from "../dnfbp/mock-adapter.js";
import { MockPlraAdapter } from "../plra/mock-adapter.js";
import { InvalidVerificationInputError } from "../errors.js";
import {
  DEFAULT_MAX_LATENCY_MS,
  DEFAULT_MIN_LATENCY_MS,
  type MockAdapterOptions,
} from "../mock-support.js";
import type { TransferPayload } from "../plra/interface.js";

const VALID_CNIC = "35202-1234567-1";
const FIXED_NOW = new Date("2026-06-28T18:00:00.000Z");

/** Fast, deterministic mock options: no real waiting, fixed clock/RNG. */
function fastOptions(overrides: MockAdapterOptions = {}): MockAdapterOptions {
  return {
    minLatencyMs: 0,
    maxLatencyMs: 0,
    random: () => 0.5,
    now: () => FIXED_NOW,
    ...overrides,
  };
}

const VALID_TRANSFER_PAYLOAD: TransferPayload = {
  buyerCnic: VALID_CNIC as Cnic,
  sellerName: "Capital Smart City (Pvt) Ltd",
  societyName: "Capital Smart City",
  plotReference: "Overseas Block, Plot 145",
  salePrice: 12_500_000_00 as PkrAmount,
};

describe("MockNadraAdapter", () => {
  it("returns a response that parses against nadraVerificationResultSchema", async () => {
    const adapter = new MockNadraAdapter(fastOptions());
    const result = await adapter.verifyCnic(VALID_CNIC);

    expect(() => nadraVerificationResultSchema.parse(result)).not.toThrow();
    expect(result.verified).toBe(true);
    expect(result.cnic).toBe(VALID_CNIC);
    expect(result.biometricConfidence).toBeGreaterThanOrEqual(0);
    expect(result.biometricConfidence).toBeLessThanOrEqual(1);
  });

  it("is deterministic for the same CNIC", async () => {
    const adapter = new MockNadraAdapter(fastOptions());
    const first = await adapter.verifyCnic(VALID_CNIC);
    const second = await adapter.verifyCnic(VALID_CNIC);
    expect(first).toStrictEqual(second);
  });

  it("throws InvalidVerificationInputError for a malformed CNIC", async () => {
    const adapter = new MockNadraAdapter(fastOptions());
    await expect(adapter.verifyCnic("not-a-cnic")).rejects.toBeInstanceOf(
      InvalidVerificationInputError,
    );
  });
});

describe("MockFbrAtlAdapter", () => {
  it("returns a response that parses against atlStatusResultSchema", async () => {
    const adapter = new MockFbrAtlAdapter(fastOptions());
    const result = await adapter.getAtlStatus(VALID_CNIC);

    expect(() => atlStatusResultSchema.parse(result)).not.toThrow();
    expect(result.cnic).toBe(VALID_CNIC);
    expect(result.ntn).toBeUndefined();
  });

  it("includes the NTN when a valid one is supplied", async () => {
    const adapter = new MockFbrAtlAdapter(fastOptions());
    const result = await adapter.getAtlStatus(VALID_CNIC, "1234567");

    expect(() => atlStatusResultSchema.parse(result)).not.toThrow();
    expect(result.ntn).toBe("1234567");
  });

  it("reports isActiveTaxpayer consistently with atlStatus", async () => {
    const adapter = new MockFbrAtlAdapter(fastOptions());
    const result = await adapter.getAtlStatus(VALID_CNIC);
    expect(result.isActiveTaxpayer).toBe(result.atlStatus !== "NON_FILER");
  });

  it("throws InvalidVerificationInputError for a malformed NTN", async () => {
    const adapter = new MockFbrAtlAdapter(fastOptions());
    await expect(
      adapter.getAtlStatus(VALID_CNIC, "bad-ntn"),
    ).rejects.toBeInstanceOf(InvalidVerificationInputError);
  });
});

describe("MockDnfbpAdapter", () => {
  it("returns a response that parses against dnfbpVerificationResultSchema", async () => {
    const adapter = new MockDnfbpAdapter(fastOptions());
    const result = await adapter.verifyDnfbpCertificate("DNFBP-2026-0001");

    expect(() => dnfbpVerificationResultSchema.parse(result)).not.toThrow();
    expect(result.verified).toBe(true);
    expect(result.certNumber).toBe("DNFBP-2026-0001");
    expect(result.agencyName).toBeDefined();
  });

  it("issues an expiry later than the check time", async () => {
    const adapter = new MockDnfbpAdapter(fastOptions());
    const result = await adapter.verifyDnfbpCertificate("DNFBP-2026-0001");
    expect(new Date(result.expiresAt!).getTime()).toBeGreaterThan(
      new Date(result.checkedAt).getTime(),
    );
  });

  it("throws InvalidVerificationInputError for an empty certificate number", async () => {
    const adapter = new MockDnfbpAdapter(fastOptions());
    await expect(
      adapter.verifyDnfbpCertificate("   "),
    ).rejects.toBeInstanceOf(InvalidVerificationInputError);
  });
});

describe("MockPlraAdapter", () => {
  it("returns a certificate that parses against plraCertificateSchema", async () => {
    const adapter = new MockPlraAdapter(fastOptions());
    const result = await adapter.issueCertificate(
      "transfer_abc",
      VALID_TRANSFER_PAYLOAD,
    );

    expect(() => plraCertificateSchema.parse(result)).not.toThrow();
    expect(result.transferId).toBe("transfer_abc");
    expect(result.certificateNumber).toMatch(/^PLRA-\d{4}-\d{6}$/);
    expect(result.documentUrl).toMatch(/^https:\/\//);
  });

  it("is deterministic for the same transferId", async () => {
    const adapter = new MockPlraAdapter(fastOptions());
    const first = await adapter.issueCertificate(
      "transfer_abc",
      VALID_TRANSFER_PAYLOAD,
    );
    const second = await adapter.issueCertificate(
      "transfer_abc",
      VALID_TRANSFER_PAYLOAD,
    );
    expect(first.certificateNumber).toBe(second.certificateNumber);
  });

  it("throws InvalidVerificationInputError for an empty transferId", async () => {
    const adapter = new MockPlraAdapter(fastOptions());
    await expect(
      adapter.issueCertificate("", VALID_TRANSFER_PAYLOAD),
    ).rejects.toBeInstanceOf(InvalidVerificationInputError);
  });

  it("throws InvalidVerificationInputError for a malformed payload", async () => {
    const adapter = new MockPlraAdapter(fastOptions());
    await expect(
      adapter.issueCertificate("transfer_abc", {
        ...VALID_TRANSFER_PAYLOAD,
        buyerCnic: "bad" as Cnic,
      }),
    ).rejects.toBeInstanceOf(InvalidVerificationInputError);
  });
});

describe("simulated latency", () => {
  it("waits within the default 1–2s window without blocking the test", async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
    const adapter = new MockNadraAdapter({
      sleep,
      random: () => 0.5,
      now: () => FIXED_NOW,
    });

    await adapter.verifyCnic(VALID_CNIC);

    expect(sleep).toHaveBeenCalledTimes(1);
    const requestedMs = sleep.mock.calls[0]![0];
    expect(requestedMs).toBeGreaterThanOrEqual(DEFAULT_MIN_LATENCY_MS);
    expect(requestedMs).toBeLessThanOrEqual(DEFAULT_MAX_LATENCY_MS);
  });

  it("uses the low end of the window when random() returns 0", async () => {
    const sleep = vi.fn<(ms: number) => Promise<void>>(async () => {});
    const adapter = new MockNadraAdapter({ sleep, random: () => 0 });
    await adapter.verifyCnic(VALID_CNIC);
    expect(sleep.mock.calls[0]![0]).toBe(DEFAULT_MIN_LATENCY_MS);
  });
});
