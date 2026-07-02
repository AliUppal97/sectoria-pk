-- M2 — Documents & downloads.
-- Additive only: new SocietyDocument model.

-- CreateEnum
CREATE TYPE "SocietyDocumentKind" AS ENUM ('MASTER_PLAN', 'BROCHURE', 'PAYMENT_PLAN', 'LOP', 'NOC', 'OTHER');

-- CreateTable
CREATE TABLE "SocietyDocument" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "kind" "SocietyDocumentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocietyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocietyDocument_societyId_kind_idx" ON "SocietyDocument"("societyId", "kind");

-- AddForeignKey
ALTER TABLE "SocietyDocument" ADD CONSTRAINT "SocietyDocument_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
