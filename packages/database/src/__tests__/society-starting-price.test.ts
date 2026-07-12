import { describe, expect, it } from "vitest";
import { URBAN_CITY_INVENTORY } from "../../prisma/fixtures/urban-city-lahore.js";
import { computeSocietyStartingPricePkr } from "../society-starting-price.js";

describe("computeSocietyStartingPricePkr", () => {
  it("returns null when there are no categories", () => {
    expect(computeSocietyStartingPricePkr([])).toBeNull();
  });

  it("returns round(pricePerSqft * sizeSqft) for a single category", () => {
    expect(
      computeSocietyStartingPricePkr([
        { pricePerSqft: 1361, sizeSqft: 20000 },
      ]),
    ).toBe(27_220_000);
  });

  it("returns the minimum rounded total across categories", () => {
    expect(
      computeSocietyStartingPricePkr([
        { pricePerSqft: 2000, sizeSqft: 1125 },
        { pricePerSqft: 1500.4, sizeSqft: 2250 },
        { pricePerSqft: 3000, sizeSqft: 4500 },
      ]),
    ).toBe(Math.min(Math.round(2000 * 1125), Math.round(1500.4 * 2250), Math.round(3000 * 4500)));
  });

  it("rounds fractional products the same way as the SQL ROUND backfill", () => {
    // 12.5 * 100 = 1250 — Math.round matches Postgres ROUND for .5-away ties
    // on positive values used by seed/category pricing.
    expect(
      computeSocietyStartingPricePkr([
        { pricePerSqft: 12.5, sizeSqft: 100 },
      ]),
    ).toBe(1250);
  });

  it("seed path uses persisted toFixed(2) pricePerSqft (Urban City 1-kanal drift)", () => {
    const oneKanal = URBAN_CITY_INVENTORY.find(
      (spec) => spec.slug === "city-venture-1-kanal-residential",
    );
    expect(oneKanal).toBeDefined();
    const { sizeSqft, totalPricePkr } = oneKanal!;

    const rawPricePerSqft = totalPricePkr / sizeSqft;
    const persistedPricePerSqft = Number(rawPricePerSqft.toFixed(2));
    const expectedFromPersisted = Math.round(
      Number(rawPricePerSqft.toFixed(2)) * sizeSqft,
    );

    // Fixture must exhibit the float ≠ Decimal drift that H1b closes.
    expect(rawPricePerSqft).not.toBe(persistedPricePerSqft);
    expect(Math.round(rawPricePerSqft * sizeSqft)).toBe(6_500_000);
    expect(expectedFromPersisted).toBe(6_500_023);
    expect(Math.round(rawPricePerSqft * sizeSqft)).not.toBe(
      expectedFromPersisted,
    );

    // Seed/recompute input is the persisted-rounded Decimal, not raw float.
    expect(
      computeSocietyStartingPricePkr([
        { pricePerSqft: persistedPricePerSqft, sizeSqft },
      ]),
    ).toBe(expectedFromPersisted);
  });
});
