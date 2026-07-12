import {
  computeSocietyStartingPricePkr,
  type Prisma,
} from "@sectoria/database";

/**
 * Recomputes `Society.startingPricePkr` as the minimum category total
 * `round(pricePerSqft * sizeSqft)`. Call inside the same `$transaction` as
 * inventory category create/update/delete so directory price filters never
 * drift (ADR-010 / discovery-search §3.3).
 *
 * Societies with no categories get `null` (excluded when a price bound is
 * active; nulls sort last on priceAsc/priceDesc).
 */
export async function recomputeSocietyStartingPrice(
  tx: Prisma.TransactionClient,
  societyId: string,
): Promise<void> {
  const categories = await tx.inventoryCategory.findMany({
    where: { societyId },
    select: { pricePerSqft: true, sizeSqft: true },
  });

  const startingPricePkr = computeSocietyStartingPricePkr(
    categories.map((category) => ({
      pricePerSqft: Number(category.pricePerSqft),
      sizeSqft: category.sizeSqft,
    })),
  );

  await tx.society.update({
    where: { id: societyId },
    data: { startingPricePkr },
  });
}
