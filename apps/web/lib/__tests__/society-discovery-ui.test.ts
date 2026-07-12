import { describe, expect, it } from "vitest";
import {
  BUDGET_PRESETS,
  PUBLIC_VERIFICATION_OPTIONS,
  budgetPresetToPriceBounds,
  countFiltersBehindSheet,
  matchBudgetPresetId,
} from "../society-discovery-ui.js";

describe("budget presets (discovery-search §2.3)", () => {
  it("maps each preset to the locked priceMinPkr / priceMaxPkr bounds", () => {
    expect(budgetPresetToPriceBounds("under-50-lakh")).toEqual({
      priceMinPkr: undefined,
      priceMaxPkr: 5_000_000,
    });
    expect(budgetPresetToPriceBounds("50l-1cr")).toEqual({
      priceMinPkr: 5_000_000,
      priceMaxPkr: 10_000_000,
    });
    expect(budgetPresetToPriceBounds("1-2cr")).toEqual({
      priceMinPkr: 10_000_000,
      priceMaxPkr: 20_000_000,
    });
    expect(budgetPresetToPriceBounds("2-5cr")).toEqual({
      priceMinPkr: 20_000_000,
      priceMaxPkr: 50_000_000,
    });
    expect(budgetPresetToPriceBounds("5cr-plus")).toEqual({
      priceMinPkr: 50_000_000,
      priceMaxPkr: undefined,
    });
  });

  it("round-trips bounds back to the matching preset id", () => {
    for (const preset of BUDGET_PRESETS) {
      expect(
        matchBudgetPresetId(preset.priceMinPkr, preset.priceMaxPkr),
      ).toBe(preset.id);
    }
  });

  it("returns undefined for unmatched or empty bounds", () => {
    expect(matchBudgetPresetId(undefined, undefined)).toBeUndefined();
    expect(matchBudgetPresetId(1, 2)).toBeUndefined();
    expect(budgetPresetToPriceBounds("not-a-preset")).toEqual({});
  });
});

describe("public verification options", () => {
  it("excludes PENDING from the public DiscoveryBar catalog", () => {
    const values = PUBLIC_VERIFICATION_OPTIONS.map((option) => option.value);
    expect(values).toEqual(["VERIFIED", "HSMS_LINKED"]);
    expect(values).not.toContain("PENDING");
  });
});

describe("countFiltersBehindSheet (first-look lock)", () => {
  it("mode=home counts budget and plot type behind Filters", () => {
    expect(
      countFiltersBehindSheet(
        {
          priceMinPkr: 5_000_000,
          priceMaxPkr: 10_000_000,
          plotType: "RESIDENTIAL",
          verificationTier: "VERIFIED",
        },
        "home",
      ),
    ).toBe(3);
  });

  it("mode=directory does not count Tier A budget/plot behind Filters", () => {
    expect(
      countFiltersBehindSheet(
        {
          priceMinPkr: 5_000_000,
          priceMaxPkr: 10_000_000,
          plotType: "RESIDENTIAL",
          verificationTier: "VERIFIED",
          authority: "LDA",
        },
        "directory",
      ),
    ).toBe(2);
  });
});
