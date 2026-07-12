import { describe, expect, it } from "vitest";
import {
  BUDGET_PRESETS,
  PUBLIC_VERIFICATION_OPTIONS,
  budgetPresetToPriceBounds,
  buildAppliedDiscoveryChips,
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

describe("buildAppliedDiscoveryChips", () => {
  const facets = {
    cities: [{ slug: "lahore", label: "Lahore", count: 3 }],
    authorities: [{ value: "LDA", count: 2 }],
    tiers: [],
    plotTypes: [],
    sizeLabels: [],
    developmentStages: [],
    bookingStatuses: [],
  };

  it("returns chips for toolbar + sheet dimensions in Tier A → Tier B order", () => {
    const chips = buildAppliedDiscoveryChips(
      {
        search: "bahria",
        citySlug: "lahore",
        priceMinPkr: 5_000_000,
        priceMaxPkr: 10_000_000,
        plotType: "RESIDENTIAL",
        verificationTier: "HSMS_LINKED",
        authority: "LDA",
        sort: "priceAsc",
      },
      facets,
      "",
      "home",
    );

    expect(chips.map((chip) => chip.id)).toEqual([
      "search",
      "citySlug",
      "budget",
      "plotType",
      "verificationTier",
      "authority",
      "sort",
    ]);
    expect(chips.find((chip) => chip.id === "citySlug")?.label).toBe("Lahore");
    expect(chips.find((chip) => chip.id === "citySlug")?.category).toBe("City");
    expect(chips.find((chip) => chip.id === "budget")?.label).toBe(
      "50 lakh – 1 crore",
    );
    expect(chips.find((chip) => chip.id === "budget")?.clear).toEqual({
      priceMinPkr: undefined,
      priceMaxPkr: undefined,
    });
    expect(chips.find((chip) => chip.id === "search")?.clearsSearchInput).toBe(
      true,
    );
  });

  it("mode=directory also chips toolbar Tier A (city, budget, plot type)", () => {
    const chips = buildAppliedDiscoveryChips(
      {
        search: "bahria",
        citySlug: "lahore",
        priceMinPkr: 5_000_000,
        priceMaxPkr: 10_000_000,
        plotType: "RESIDENTIAL",
        verificationTier: "VERIFIED",
        authority: "LDA",
        sizeLabel: "5 Marla",
      },
      facets,
      "",
      "directory",
    );

    expect(chips.map((chip) => chip.id)).toEqual([
      "search",
      "citySlug",
      "budget",
      "plotType",
      "verificationTier",
      "authority",
      "sizeLabel",
    ]);
  });

  it("uses pendingSearch when URL search is empty (debounce lag)", () => {
    const chips = buildAppliedDiscoveryChips({}, facets, "  dha  ");
    expect(chips).toHaveLength(1);
    expect(chips[0]).toMatchObject({
      id: "search",
      label: "dha",
      clearsSearchInput: true,
    });
  });

  it("returns an empty list when nothing is applied", () => {
    expect(buildAppliedDiscoveryChips({}, facets)).toEqual([]);
  });
});
