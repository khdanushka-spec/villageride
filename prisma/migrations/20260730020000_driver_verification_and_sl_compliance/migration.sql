-- CreateEnum
CREATE TYPE "BackgroundCheckStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'CLEARED', 'FAILED');

-- CreateEnum
CREATE TYPE "LicenceClass" AS ENUM ('A1', 'A', 'B1', 'B', 'C1', 'C', 'CE', 'D1', 'D', 'DE', 'G1', 'G', 'J');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'REVENUE_LICENCE';
ALTER TYPE "DocumentType" ADD VALUE 'VEHICLE_EMISSION_TEST';
ALTER TYPE "DocumentType" ADD VALUE 'POLICE_CLEARANCE';
ALTER TYPE "DocumentType" ADD VALUE 'GRAMA_NILADHARI_CERTIFICATE';
ALTER TYPE "DocumentType" ADD VALUE 'MEDICAL_CERTIFICATE';
ALTER TYPE "DocumentType" ADD VALUE 'VEHICLE_FITNESS_CERTIFICATE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DriverStatus" ADD VALUE 'DOCUMENTS_UNDER_REVIEW';
ALTER TYPE "DriverStatus" ADD VALUE 'BACKGROUND_CHECK';
ALTER TYPE "DriverStatus" ADD VALUE 'DEACTIVATED';
ALTER TYPE "DriverStatus" ADD VALUE 'COMPLIANCE_HOLD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_EXPIRING_SOON';
ALTER TYPE "NotificationType" ADD VALUE 'DOCUMENT_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'DRIVER_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'DRIVER_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'BACKGROUND_CHECK_CLEARED';
ALTER TYPE "NotificationType" ADD VALUE 'COMPLIANCE_HOLD';
ALTER TYPE "NotificationType" ADD VALUE 'PERFORMANCE_WARNING';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "issuedAt" TIMESTAMP(3),
ADD COLUMN     "issuingAuthority" TEXT;

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "acceptedTrips" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "backgroundCheckAt" TIMESTAMP(3),
ADD COLUMN     "backgroundCheckById" TEXT,
ADD COLUMN     "backgroundCheckNotes" TEXT,
ADD COLUMN     "backgroundCheckStatus" "BackgroundCheckStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "cancelledTrips" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "complianceHoldAt" TIMESTAMP(3),
ADD COLUMN     "complianceHoldReason" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivationReason" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "documentsVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "documentsVerifiedById" TEXT,
ADD COLUMN     "gnDivision" TEXT,
ADD COLUMN     "licenceClass" "LicenceClass",
ADD COLUMN     "licenceIssuedAt" TIMESTAMP(3),
ADD COLUMN     "nicNumber" TEXT,
ADD COLUMN     "offeredTrips" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "emissionTestExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emissionTestExpiry" TIMESTAMP(3),
ADD COLUMN     "fitnessCertExpiry" TIMESTAMP(3),
ADD COLUMN     "insurancePolicyNo" TEXT,
ADD COLUMN     "insurerName" TEXT,
ADD COLUMN     "revenueLicenceExpiry" TIMESTAMP(3),
ADD COLUMN     "revenueLicenceNo" TEXT;

-- CreateTable
CREATE TABLE "DriverEligibilityRule" (
    "id" TEXT NOT NULL,
    "associationId" TEXT,
    "minDriverAge" INTEGER NOT NULL DEFAULT 18,
    "minLicenceYears" INTEGER NOT NULL DEFAULT 1,
    "maxVehicleAgeYears" INTEGER NOT NULL DEFAULT 20,
    "requirePoliceClearance" BOOLEAN NOT NULL DEFAULT true,
    "requireGramaNiladhari" BOOLEAN NOT NULL DEFAULT true,
    "requireMedicalCert" BOOLEAN NOT NULL DEFAULT true,
    "requireRevenueLicence" BOOLEAN NOT NULL DEFAULT true,
    "requireEmissionTest" BOOLEAN NOT NULL DEFAULT true,
    "minRating" DECIMAL(3,2) NOT NULL DEFAULT 4.0,
    "maxCancellationRate" DECIMAL(4,3) NOT NULL DEFAULT 0.25,
    "ratingGracePeriod" INTEGER NOT NULL DEFAULT 20,
    "expiryWarningDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverEligibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverEligibilityRule_associationId_key" ON "DriverEligibilityRule"("associationId");

-- CreateIndex
CREATE INDEX "Document_expiresAt_idx" ON "Document"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_nicNumber_key" ON "Driver"("nicNumber");

-- CreateIndex
CREATE INDEX "Driver_status_idx" ON "Driver"("status");

-- AddForeignKey
ALTER TABLE "DriverEligibilityRule" ADD CONSTRAINT "DriverEligibilityRule_associationId_fkey" FOREIGN KEY ("associationId") REFERENCES "Association"("id") ON DELETE CASCADE ON UPDATE CASCADE;

