import { describe, expect, it } from "vitest";
import {
  parseSocietyDiscoveryParams,
  serializeSocietyDiscoveryParams,
} from "../society-discovery-params.js";

describe("parseSocietyDiscoveryParams", () => {
  it("parses search, citySlug, authority, and verificationTier", () => {
    expect(
      parseSocietyDiscoveryParams({
        search: "bahria",
        citySlug: "lahore",
        authority: "LDA",
        verificationTier: "HSMS_LINKED",
      }),
    ).toEqual({
      search: "bahria",
      citySlug: "lahore",
      authority: "LDA",
      verificationTier: "HSMS_LINKED",
    });
  });

  it("trims search and ignores empty / whitespace-only search", () => {
    expect(parseSocietyDiscoveryParams({ search: "  bahria  " })).toEqual({
      search: "bahria",
    });
    expect(parseSocietyDiscoveryParams({ search: "   " })).toEqual({});
    expect(parseSocietyDiscoveryParams({ search: "" })).toEqual({});
  });

  it("clamps oversized search to the API max length", () => {
    const long = "a".repeat(200);
    expect(parseSocietyDiscoveryParams({ search: long }).search).toHaveLength(
      120,
    );
  });

  it("ignores invalid verificationTier values", () => {
    expect(
      parseSocietyDiscoveryParams({ verificationTier: "NOT_A_TIER" }),
    ).toEqual({});
    expect(
      parseSocietyDiscoveryParams({ verificationTier: "verified" }),
    ).toEqual({});
  });

  it("accepts PENDING for API/ops URLs even though public UI omits it", () => {
    expect(
      parseSocietyDiscoveryParams({ verificationTier: "PENDING" }),
    ).toEqual({ verificationTier: "PENDING" });
  });

  it("ignores array / repeated param values", () => {
    expect(
      parseSocietyDiscoveryParams({
        search: ["a", "b"],
        citySlug: ["lahore"],
      }),
    ).toEqual({});
  });
});

describe("serializeSocietyDiscoveryParams", () => {
  it("omits undefined keys", () => {
    const params = serializeSocietyDiscoveryParams({
      search: "bahria",
      citySlug: "lahore",
    });
    expect(params.toString()).toBe("search=bahria&citySlug=lahore");
    expect(params.has("authority")).toBe(false);
    expect(params.has("verificationTier")).toBe(false);
  });

  it("round-trips with parse", () => {
    const original = {
      search: "dha",
      citySlug: "islamabad",
      authority: "CDA",
      verificationTier: "VERIFIED" as const,
    };
    const serialized = serializeSocietyDiscoveryParams(original);
    const record = Object.fromEntries(serialized.entries());
    expect(parseSocietyDiscoveryParams(record)).toEqual(original);
  });
});
