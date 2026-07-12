-- H1 / ADR-010 — denormalized Society.startingPricePkr for directory price
-- filter and sort. Additive only: no existing column is dropped or renamed.
--
-- Money note: directory price bounds are whole-rupee integers in the URL/API
-- contract, so this column is Int (not Decimal). Category pricePerSqft remains
-- Decimal for exact pricing math.

-- AlterTable
ALTER TABLE "Society" ADD COLUMN "startingPricePkr" INTEGER;

-- Backfill: min(round(pricePerSqft * sizeSqft)) per society from InventoryCategory.
-- Societies with no categories stay NULL (excluded when a price bound is active;
-- nulls sort last on priceAsc/priceDesc).
UPDATE "Society" AS s
SET "startingPricePkr" = sub.min_price
FROM (
  SELECT
    "societyId",
    MIN(ROUND("pricePerSqft" * "sizeSqft"))::INTEGER AS min_price
  FROM "InventoryCategory"
  GROUP BY "societyId"
) AS sub
WHERE s."id" = sub."societyId";

-- Composite index for PUBLISHED directory queries that filter/sort by price.
CREATE INDEX "Society_publishStatus_startingPricePkr_idx"
  ON "Society"("publishStatus", "startingPricePkr");
