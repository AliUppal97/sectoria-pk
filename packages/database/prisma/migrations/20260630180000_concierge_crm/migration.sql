-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SALES_ADVISOR';

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('compare', 'category', 'support', 'society');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST');
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "QuotePaymentType" AS ENUM ('TOKEN', 'INSTALLMENT');
CREATE TYPE "QuotePaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED');
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'ALLOCATED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "societyIds" TEXT[],
    "categoryId" TEXT,
    "budgetPkr" INTEGER,
    "paymentPlanPreference" TEXT,
    "source" "LeadSource" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "buyerUserId" TEXT,
    "assignedAdvisorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "dealerNetPkr" INTEGER NOT NULL,
    "quotedPricePkr" INTEGER NOT NULL,
    "spreadPkr" INTEGER NOT NULL,
    "tokenAmountPkr" INTEGER NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentPlanLabel" TEXT,
    "installmentsDirect" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "buyerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DealerNetSheet" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "netPricePkr" INTEGER NOT NULL,
    "paymentPlanTerms" TEXT,
    "refreshedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerNetSheet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuotePayment" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "type" "QuotePaymentType" NOT NULL,
    "amountPkr" INTEGER NOT NULL,
    "installmentIndex" INTEGER,
    "status" "QuotePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "externalEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotePayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FulfillmentOrder" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "orderRef" TEXT NOT NULL,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "plotRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_buyerUserId_idx" ON "Lead"("buyerUserId");
CREATE INDEX "Lead_assignedAdvisorId_idx" ON "Lead"("assignedAdvisorId");

CREATE INDEX "Quote_leadId_idx" ON "Quote"("leadId");
CREATE INDEX "Quote_status_idx" ON "Quote"("status");
CREATE INDEX "Quote_buyerUserId_idx" ON "Quote"("buyerUserId");
CREATE INDEX "Quote_dealerId_idx" ON "Quote"("dealerId");

CREATE UNIQUE INDEX "DealerNetSheet_dealerId_categoryId_key" ON "DealerNetSheet"("dealerId", "categoryId");
CREATE INDEX "DealerNetSheet_categoryId_idx" ON "DealerNetSheet"("categoryId");

CREATE INDEX "QuotePayment_quoteId_idx" ON "QuotePayment"("quoteId");
CREATE INDEX "QuotePayment_externalEventId_idx" ON "QuotePayment"("externalEventId");

CREATE UNIQUE INDEX "FulfillmentOrder_quoteId_key" ON "FulfillmentOrder"("quoteId");
CREATE UNIQUE INDEX "FulfillmentOrder_orderRef_key" ON "FulfillmentOrder"("orderRef");
CREATE INDEX "FulfillmentOrder_dealerId_idx" ON "FulfillmentOrder"("dealerId");
CREATE INDEX "FulfillmentOrder_status_idx" ON "FulfillmentOrder"("status");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedAdvisorId_fkey" FOREIGN KEY ("assignedAdvisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "DealerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DealerNetSheet" ADD CONSTRAINT "DealerNetSheet_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "DealerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DealerNetSheet" ADD CONSTRAINT "DealerNetSheet_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuotePayment" ADD CONSTRAINT "QuotePayment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "DealerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
