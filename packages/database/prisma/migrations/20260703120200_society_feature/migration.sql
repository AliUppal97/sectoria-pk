-- M3 — Rich amenities & stat highlights.
-- Additive only: AmenityFeature + SocietyHighlight models.

-- CreateTable
CREATE TABLE "AmenityFeature" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "imageKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AmenityFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocietyHighlight" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SocietyHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AmenityFeature_societyId_sortOrder_idx" ON "AmenityFeature"("societyId", "sortOrder");

-- CreateIndex
CREATE INDEX "SocietyHighlight_societyId_sortOrder_idx" ON "SocietyHighlight"("societyId", "sortOrder");

-- AddForeignKey
ALTER TABLE "AmenityFeature" ADD CONSTRAINT "AmenityFeature_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocietyHighlight" ADD CONSTRAINT "SocietyHighlight_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
