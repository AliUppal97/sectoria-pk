import { describe, expect, it } from "vitest";
import { PlotType, fbrValuationTableSchema } from "@sectoria/types";
import {
  CURRENT_FBR_VALUATION,
  lookupFbrValuation,
} from "../fbr-valuation-table.js";

describe("lookupFbrValuation", () => {
  it("returns residential per-sqft × size for a known zone", () => {
    // Zone-II residential is 8,000/sqft in the current table.
    const value = lookupFbrValuation({
      zone: "Zone-II",
      plotType: PlotType.RESIDENTIAL,
      sizeSqft: 1125,
    });
    expect(value).toBe(8_000 * 1125);
  });

  it("uses the commercial rate for commercial plots in the same zone", () => {
    const residential = lookupFbrValuation({
      zone: "Zone-I",
      plotType: PlotType.RESIDENTIAL,
      sizeSqft: 1000,
    });
    const commercial = lookupFbrValuation({
      zone: "Zone-I",
      plotType: PlotType.COMMERCIAL,
      sizeSqft: 1000,
    });
    expect(residential).toBe(12_000 * 1000);
    expect(commercial).toBe(22_000 * 1000);
    expect(commercial!).toBeGreaterThan(residential!);
  });

  it("returns null for a zone not on the valuation table", () => {
    expect(
      lookupFbrValuation({
        zone: "Zone-DOES-NOT-EXIST",
        plotType: PlotType.RESIDENTIAL,
        sizeSqft: 1000,
      }),
    ).toBeNull();
  });

  it("returns null for a non-positive or non-integer size", () => {
    expect(
      lookupFbrValuation({
        zone: "Zone-I",
        plotType: PlotType.RESIDENTIAL,
        sizeSqft: 0,
      }),
    ).toBeNull();
    expect(
      lookupFbrValuation({
        zone: "Zone-I",
        plotType: PlotType.RESIDENTIAL,
        sizeSqft: -100,
      }),
    ).toBeNull();
    expect(
      lookupFbrValuation({
        zone: "Zone-I",
        plotType: PlotType.RESIDENTIAL,
        sizeSqft: 12.5,
      }),
    ).toBeNull();
  });

  it("prices a historical transfer against an explicitly passed table", () => {
    const customTable = fbrValuationTableSchema.parse({
      fiscalYear: "2024-25",
      zones: { "Zone-I": { residentialPerSqft: 6_000, commercialPerSqft: 9_000 } },
    });
    expect(
      lookupFbrValuation(
        { zone: "Zone-I", plotType: PlotType.RESIDENTIAL, sizeSqft: 1000 },
        customTable,
      ),
    ).toBe(6_000 * 1000);
  });

  it("exposes a schema-valid current table covering the seeded zones", () => {
    expect(() => fbrValuationTableSchema.parse(CURRENT_FBR_VALUATION)).not.toThrow();
    for (const zone of ["Zone-I", "Zone-II", "Zone-III"]) {
      expect(CURRENT_FBR_VALUATION.zones[zone]).toBeDefined();
    }
  });
});
