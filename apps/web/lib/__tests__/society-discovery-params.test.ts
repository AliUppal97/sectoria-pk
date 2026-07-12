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
      plotType: undefined,
      sizeLabel: undefined,
      priceMinPkr: undefined,
      priceMaxPkr: undefined,
      developmentStage: undefined,
      bookingStatus: undefined,
      sort: undefined,
    });
  });

  it("trims search and ignores empty / whitespace-only search", () => {
    expect(parseSocietyDiscoveryParams({ search: "  bahria  " })).toMatchObject({
      search: "bahria",
    });
    expect(parseSocietyDiscoveryParams({ search: "   " }).search).toBeUndefined();
    expect(parseSocietyDiscoveryParams({ search: "" }).search).toBeUndefined();
  });

  it("clamps oversized search to the API max length", () => {
    const long = "a".repeat(200);
    expect(parseSocietyDiscoveryParams({ search: long }).search).toHaveLength(
      120,
    );
  });

  it("ignores invalid verificationTier values", () => {
    expect(
      parseSocietyDiscoveryParams({ verificationTier: "NOT_A_TIER" })
        .verificationTier,
    ).toBeUndefined();
    expect(
      parseSocietyDiscoveryParams({ verificationTier: "verified" })
        .verificationTier,
    ).toBeUndefined();
  });

  it("accepts PENDING for API/ops URLs even though public UI omits it", () => {
    expect(
      parseSocietyDiscoveryParams({ verificationTier: "PENDING" }),
    ).toMatchObject({ verificationTier: "PENDING" });
  });

  it("ignores array / repeated param values", () => {
    expect(
      parseSocietyDiscoveryParams({
        search: ["a", "b"],
        citySlug: ["lahore"],
      }).search,
    ).toBeUndefined();
  });

  it("parses H1 filter fields and ignores invalid enums", () => {
    expect(
      parseSocietyDiscoveryParams({
        plotType: "RESIDENTIAL",
        sizeLabel: "5 Marla",
        priceMinPkr: "5000000",
        priceMaxPkr: "10000000",
        developmentStage: "Possession Underway",
        bookingStatus: "OPEN",
        sort: "priceAsc",
      }),
    ).toMatchObject({
      plotType: "RESIDENTIAL",
      sizeLabel: "5 Marla",
      priceMinPkr: 5_000_000,
      priceMaxPkr: 10_000_000,
      developmentStage: "Possession Underway",
      bookingStatus: "OPEN",
      sort: "priceAsc",
    });

    expect(
      parseSocietyDiscoveryParams({
        plotType: "VILLA",
        bookingStatus: "MAYBE",
        sort: "ratingDesc",
      }),
    ).toMatchObject({
      plotType: undefined,
      bookingStatus: undefined,
      sort: undefined,
    });
  });

  it("drops the price pair when min > max", () => {
    expect(
      parseSocietyDiscoveryParams({
        priceMinPkr: "10000000",
        priceMaxPkr: "1000000",
      }),
    ).toMatchObject({
      priceMinPkr: undefined,
      priceMaxPkr: undefined,
    });
  });

  it("ignores non-numeric price bounds", () => {
    expect(
      parseSocietyDiscoveryParams({
        priceMinPkr: "abc",
        priceMaxPkr: "12.5",
      }),
    ).toMatchObject({
      priceMinPkr: undefined,
      priceMaxPkr: undefined,
    });
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

  it("omits default sort=name from the URL", () => {
    const params = serializeSocietyDiscoveryParams({ sort: "name" });
    expect(params.has("sort")).toBe(false);
  });

  it("round-trips with parse", () => {
    const original = {
      search: "dha",
      citySlug: "islamabad",
      authority: "CDA",
      verificationTier: "VERIFIED" as const,
      plotType: "RESIDENTIAL" as const,
      sizeLabel: "10 Marla",
      priceMinPkr: 5_000_000,
      priceMaxPkr: 20_000_000,
      developmentStage: "Under Development",
      bookingStatus: "OPEN" as const,
      sort: "priceDesc" as const,
    };
    const serialized = serializeSocietyDiscoveryParams(original);
    const record = Object.fromEntries(serialized.entries());
    expect(parseSocietyDiscoveryParams(record)).toEqual(original);
  });
});
