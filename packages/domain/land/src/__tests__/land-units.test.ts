import { describe, expect, it } from "vitest";
import {
  SQFT_PER_KANAL,
  developedLandPct,
  formatLandKanal,
  sqFtToKanal,
  sqMetersToKanal,
} from "../land-units.js";

describe("land-units", () => {
  it("converts sq ft to kanal using Punjab standard", () => {
    expect(sqFtToKanal(SQFT_PER_KANAL)).toBe(1);
    expect(sqFtToKanal(5445 * 8)).toBe(8);
  });

  it("converts sq metres to kanal", () => {
    const oneKanalSqM = SQFT_PER_KANAL * 0.092903;
    expect(sqMetersToKanal(oneKanalSqM)).toBeCloseTo(1, 2);
  });

  it("formats kanal with acre equivalent for large values", () => {
    expect(formatLandKanal(800)).toContain("kanal");
    expect(formatLandKanal(800)).toContain("acres");
  });

  it("computes developed land percentage", () => {
    expect(developedLandPct(1000, 600)).toBe(60);
    expect(developedLandPct(0, 100)).toBeNull();
  });
});
