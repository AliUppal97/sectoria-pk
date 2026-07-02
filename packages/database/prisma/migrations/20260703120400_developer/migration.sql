-- M5 — Developer / builder profiles.
-- Additive only: Developer + DeveloperProject models + Society.developerId FK.

-- CreateTable
CREATE TABLE "Developer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoKey" TEXT,
    "websiteUrl" TEXT,
    "foundedYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeveloperProject" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageKey" TEXT,
    "year" INTEGER,
    "city" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DeveloperProject_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Society" ADD COLUMN "developerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Developer_slug_key" ON "Developer"("slug");

-- CreateIndex
CREATE INDEX "DeveloperProject_developerId_sortOrder_idx" ON "DeveloperProject"("developerId", "sortOrder");

-- CreateIndex
CREATE INDEX "Society_developerId_idx" ON "Society"("developerId");

-- AddForeignKey
ALTER TABLE "DeveloperProject" ADD CONSTRAINT "DeveloperProject_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Society" ADD CONSTRAINT "Society_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
