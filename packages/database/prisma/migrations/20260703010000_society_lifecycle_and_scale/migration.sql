-- M0 — Society lifecycle, onboarding & directory scale.
--
-- Additive only: no existing column is dropped or renamed. Adds the publication
-- lifecycle (publishStatus/publishedAt/createdById), the directory-scale indexes,
-- and a pg_trgm trigram index for index-backed name search.

-- CreateEnum
CREATE TYPE "SocietyPublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable: new lifecycle columns. The column default is DRAFT, so rows added
-- from now on are drafts; existing rows are backfilled to PUBLISHED just below.
ALTER TABLE "Society"
  ADD COLUMN "publishStatus" "SocietyPublishStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "createdById" TEXT;

-- Backfill: every society that already existed was implicitly public, so mark it
-- PUBLISHED (and stamp publishedAt from its creation time) — without this the
-- marketplace would go dark the moment the PUBLISHED filter lands.
UPDATE "Society"
  SET "publishStatus" = 'PUBLISHED',
      "publishedAt" = "createdAt"
  WHERE "publishStatus" = 'DRAFT';

-- Directory scale (M0.7): index the columns the public directory filters on.
CREATE INDEX "Society_authority_idx" ON "Society"("authority");
CREATE INDEX "Society_verificationTier_idx" ON "Society"("verificationTier");
CREATE INDEX "Society_publishStatus_idx" ON "Society"("publishStatus");
CREATE INDEX "Society_publishStatus_citySlug_idx" ON "Society"("publishStatus", "citySlug");

-- Index-backed name search (M0.7): a trigram GIN index so name/city ILIKE search
-- scales past the current in-memory filter. pg_trgm is a standard contrib module.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Society_name_trgm_idx" ON "Society" USING GIN ("name" gin_trgm_ops);
