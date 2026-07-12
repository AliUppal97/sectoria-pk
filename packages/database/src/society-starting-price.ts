/**
 * Minimum category total for denormalized `Society.startingPricePkr`.
 *
 * Formula matches the H1 migration backfill and
 * `recomputeSocietyStartingPrice` in `@sectoria/api-client`:
 * `min(round(pricePerSqft * sizeSqft))`. Societies with no categories
 * stay `null` (excluded when a price bound is active; nulls sort last).
 *
 * Lives here (not api-client) so Prisma seeds can set the column without
 * importing the composition root (homepage-v2 H1a / ADR-010).
 */
export function computeSocietyStartingPricePkr(
  categories: ReadonlyArray<{
    readonly pricePerSqft: number;
    readonly sizeSqft: number;
  }>,
): number | null {
  let startingPricePkr: number | null = null;
  for (const category of categories) {
    const totalPrice = Math.round(category.pricePerSqft * category.sizeSqft);
    startingPricePkr =
      startingPricePkr === null
        ? totalPrice
        : Math.min(startingPricePkr, totalPrice);
  }
  return startingPricePkr;
}
