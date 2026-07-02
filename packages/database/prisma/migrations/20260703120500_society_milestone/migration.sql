-- M6 — Milestone roadmap.
-- Additive only: SocietyMilestone model.

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('COMPLETED', 'IN_PROGRESS', 'PLANNED');

-- CreateTable
CREATE TABLE "SocietyMilestone" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'COMPLETED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SocietyMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocietyMilestone_societyId_occurredOn_idx" ON "SocietyMilestone"("societyId", "occurredOn");

-- AddForeignKey
ALTER TABLE "SocietyMilestone" ADD CONSTRAINT "SocietyMilestone_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
