-- M4 — Location & connectivity.
-- Additive only: NearbyLandmark model.

-- CreateEnum
CREATE TYPE "LandmarkCategory" AS ENUM ('AIRPORT', 'HOSPITAL', 'SCHOOL', 'UNIVERSITY', 'MARKET', 'MOSQUE', 'HIGHWAY', 'INTERCHANGE', 'LANDMARK');

-- CreateTable
CREATE TABLE "NearbyLandmark" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "LandmarkCategory" NOT NULL,
    "distanceKm" DECIMAL(65,30),
    "driveTimeMins" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NearbyLandmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NearbyLandmark_societyId_sortOrder_idx" ON "NearbyLandmark"("societyId", "sortOrder");

-- AddForeignKey
ALTER TABLE "NearbyLandmark" ADD CONSTRAINT "NearbyLandmark_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
