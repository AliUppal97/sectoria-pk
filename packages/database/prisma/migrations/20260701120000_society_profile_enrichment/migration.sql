-- CreateEnum
CREATE TYPE "SocietyBookingStatus" AS ENUM ('OPEN', 'CLOSED', 'UPCOMING');

-- CreateEnum
CREATE TYPE "SocietyUpdateCategory" AS ENUM ('NOC', 'LICENSE', 'POSSESSION', 'BOOKING', 'DEVELOPMENT', 'GENERAL');

-- AlterTable
ALTER TABLE "Society" ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "totalLandKanal" DECIMAL(65,30),
ADD COLUMN     "developedLandKanal" DECIMAL(65,30),
ADD COLUMN     "boundaryGeoJson" JSONB,
ADD COLUMN     "bookingStatus" "SocietyBookingStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "bookingOpensAt" TIMESTAMP(3),
ADD COLUMN     "bookingClosesAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SocietyUpdate" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "SocietyUpdateCategory" NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocietyUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocietyUpdate_societyId_publishedAt_idx" ON "SocietyUpdate"("societyId", "publishedAt");

-- AddForeignKey
ALTER TABLE "SocietyUpdate" ADD CONSTRAINT "SocietyUpdate_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
