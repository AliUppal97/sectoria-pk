import type { PrismaClient } from "@sectoria/database";
import { AuthorizationStatus } from "@sectoria/types";

/**
 * Resolves the inventory category IDs a dealer may see leads for, based on
 * their active {@link SocietyPartnerAuthorization} rows. A `null` category scope
 * on an authorization grants access to every category in that society.
 */
export async function resolveAuthorizedCategoryIds(
  db: PrismaClient,
  dealerId: string,
): Promise<string[]> {
  const authorizations = await db.societyPartnerAuthorization.findMany({
    where: { dealerId, status: AuthorizationStatus.ACTIVE },
    select: { societyId: true, categoryId: true },
  });

  if (authorizations.length === 0) return [];

  const categoryIds = new Set<string>();

  for (const auth of authorizations) {
    if (auth.categoryId !== null) {
      categoryIds.add(auth.categoryId);
      continue;
    }

    const societyCategories = await db.inventoryCategory.findMany({
      where: { societyId: auth.societyId },
      select: { id: true },
    });
    for (const category of societyCategories) {
      categoryIds.add(category.id);
    }
  }

  return [...categoryIds];
}
