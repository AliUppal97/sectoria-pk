-- M1 — Visual media, galleries & virtual tour.
-- Additive only: new Society URL fields + SocietyMedia model.

-- CreateEnum
CREATE TYPE "SocietyMediaKind" AS ENUM ('HERO', 'GALLERY', 'PROGRESS', 'FLOORPLAN');

-- AlterTable
ALTER TABLE "Society"
  ADD COLUMN "virtualTourUrl" TEXT,
  ADD COLUMN "promoVideoUrl" TEXT;

-- CreateTable
CREATE TABLE "SocietyMedia" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "kind" "SocietyMediaKind" NOT NULL DEFAULT 'GALLERY',
    "storageKey" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "caption" TEXT,
    "capturedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocietyMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocietyMedia_societyId_kind_sortOrder_idx" ON "SocietyMedia"("societyId", "kind", "sortOrder");

-- AddForeignKey
ALTER TABLE "SocietyMedia" ADD CONSTRAINT "SocietyMedia_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
