-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'SOCIETY_ADMIN', 'DEALER_PARTNER', 'BUYER');

-- CreateEnum
CREATE TYPE "AtlStatus" AS ENUM ('FILER', 'LATE_FILER', 'NON_FILER');

-- CreateEnum
CREATE TYPE "VerificationTier" AS ENUM ('PENDING', 'VERIFIED', 'HSMS_LINKED');

-- CreateEnum
CREATE TYPE "PlotType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "AllocationStrategy" AS ENUM ('FIFO', 'BALLOT');

-- CreateEnum
CREATE TYPE "PlotStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ALLOCATED', 'TRANSFERRED');

-- CreateEnum
CREATE TYPE "EscrowState" AS ENUM ('BOOKING_TOKEN_PAID', 'ALLOCATED', 'INSTALLMENT_DUE', 'INSTALLMENT_PAID', 'FULLY_PAID', 'DOCUMENTS_ISSUED', 'COMMISSION_RELEASED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "cnicEncrypted" TEXT,
    "ntnEncrypted" TEXT,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'BUYER',
    "atlStatus" "AtlStatus" NOT NULL DEFAULT 'NON_FILER',
    "atlVerifiedAt" TIMESTAMP(3),
    "nadraVerified" BOOLEAN NOT NULL DEFAULT false,
    "trustScore" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "societyId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Society" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "citySlug" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "lopReferenceNo" TEXT,
    "nocReferenceNo" TEXT,
    "hsmsLinked" BOOLEAN NOT NULL DEFAULT false,
    "verificationTier" "VerificationTier" NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "amenities" TEXT[],
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "developmentStage" TEXT NOT NULL,
    "developmentPct" INTEGER NOT NULL DEFAULT 0,
    "heroImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Society_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCategory" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "block" TEXT NOT NULL,
    "plotType" "PlotType" NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "sizeSqft" INTEGER NOT NULL,
    "pricePerSqft" DECIMAL(65,30) NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "availableUnits" INTEGER NOT NULL,
    "allocationStrategy" "AllocationStrategy" NOT NULL DEFAULT 'FIFO',
    "fbrValuationZone" TEXT NOT NULL,

    CONSTRAINT "InventoryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "downPaymentPct" DECIMAL(65,30) NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "installmentInterval" TEXT NOT NULL,

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plot" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "serialNo" TEXT NOT NULL,
    "plotNo" TEXT,
    "status" "PlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "bookingId" TEXT,

    CONSTRAINT "Plot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "paymentPlanId" TEXT NOT NULL,
    "dealerId" TEXT,
    "status" "EscrowState" NOT NULL DEFAULT 'BOOKING_TOKEN_PAID',
    "taxBreakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "dnfbpCertNumber" TEXT,
    "dnfbpVerified" BOOLEAN NOT NULL DEFAULT false,
    "completedDeals" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DealerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocietyPartnerAuthorization" (
    "id" TEXT NOT NULL,
    "societyId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "categoryId" TEXT,
    "commissionSplitPct" DECIMAL(65,30) NOT NULL,
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "SocietyPartnerAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subjectUserId" TEXT,
    "subjectSocietyId" TEXT,
    "bookingId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "bookingId" TEXT,
    "payload" JSONB NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_societyId_idx" ON "User"("societyId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Society_slug_key" ON "Society"("slug");

-- CreateIndex
CREATE INDEX "Society_citySlug_idx" ON "Society"("citySlug");

-- CreateIndex
CREATE INDEX "InventoryCategory_societyId_idx" ON "InventoryCategory"("societyId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCategory_societyId_slug_key" ON "InventoryCategory"("societyId", "slug");

-- CreateIndex
CREATE INDEX "PaymentPlan_categoryId_idx" ON "PaymentPlan"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Plot_serialNo_key" ON "Plot"("serialNo");

-- CreateIndex
CREATE UNIQUE INDEX "Plot_bookingId_key" ON "Plot"("bookingId");

-- CreateIndex
CREATE INDEX "Plot_categoryId_idx" ON "Plot"("categoryId");

-- CreateIndex
CREATE INDEX "Booking_categoryId_idx" ON "Booking"("categoryId");

-- CreateIndex
CREATE INDEX "Booking_buyerId_idx" ON "Booking"("buyerId");

-- CreateIndex
CREATE INDEX "Booking_dealerId_idx" ON "Booking"("dealerId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerProfile_userId_key" ON "DealerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerProfile_slug_key" ON "DealerProfile"("slug");

-- CreateIndex
CREATE INDEX "SocietyPartnerAuthorization_dealerId_idx" ON "SocietyPartnerAuthorization"("dealerId");

-- CreateIndex
CREATE UNIQUE INDEX "SocietyPartnerAuthorization_societyId_dealerId_categoryId_key" ON "SocietyPartnerAuthorization"("societyId", "dealerId", "categoryId");

-- CreateIndex
CREATE INDEX "Review_authorId_idx" ON "Review"("authorId");

-- CreateIndex
CREATE INDEX "Review_subjectUserId_idx" ON "Review"("subjectUserId");

-- CreateIndex
CREATE INDEX "Review_subjectSocietyId_idx" ON "Review"("subjectSocietyId");

-- CreateIndex
CREATE INDEX "Review_bookingId_idx" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "LedgerEvent_entityId_idx" ON "LedgerEvent"("entityId");

-- CreateIndex
CREATE INDEX "LedgerEvent_bookingId_idx" ON "LedgerEvent"("bookingId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCategory" ADD CONSTRAINT "InventoryCategory_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "DealerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealerProfile" ADD CONSTRAINT "DealerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocietyPartnerAuthorization" ADD CONSTRAINT "SocietyPartnerAuthorization_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "Society"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocietyPartnerAuthorization" ADD CONSTRAINT "SocietyPartnerAuthorization_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "DealerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_subjectSocietyId_fkey" FOREIGN KEY ("subjectSocietyId") REFERENCES "Society"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEvent" ADD CONSTRAINT "LedgerEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
