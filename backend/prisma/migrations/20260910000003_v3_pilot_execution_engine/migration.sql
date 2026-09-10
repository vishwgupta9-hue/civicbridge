-- AlterEnum
ALTER TYPE "ClearanceStatus" ADD VALUE IF NOT EXISTS 'REQUIRED';
ALTER TYPE "ClearanceStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "ClearanceStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "ClearanceStatus" ADD VALUE IF NOT EXISTS 'NEEDS_MORE_INFO';

-- AlterTable
ALTER TABLE "PilotDeployment" ADD COLUMN IF NOT EXISTS "actualBeneficiaryCount" INTEGER,
ADD COLUMN IF NOT EXISTS "actualEndDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "actualStartDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "clearanceDecidedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "clearanceRequestedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "evidenceDocumentUrl" TEXT,
ADD COLUMN IF NOT EXISTS "problemId" TEXT,
ADD COLUMN IF NOT EXISTS "responsibleOrgId" TEXT,
ADD COLUMN IF NOT EXISTS "risksRequirements" TEXT;

-- AlterTable
ALTER TABLE "PilotMetric" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'REPORTED',
ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "verifiedById" TEXT;

-- AlterTable
ALTER TABLE "PilotVerification" ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
ADD COLUMN IF NOT EXISTS "verificationRole" "Role";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PilotDeployment_problemId_idx" ON "PilotDeployment"("problemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PilotDeployment_responsibleOrgId_idx" ON "PilotDeployment"("responsibleOrgId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PilotMetric_status_idx" ON "PilotMetric"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PilotVerification_organizationId_idx" ON "PilotVerification"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PilotVerification_finding_idx" ON "PilotVerification"("finding");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PilotDeployment_problemId_fkey') THEN
    ALTER TABLE "PilotDeployment" ADD CONSTRAINT "PilotDeployment_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PilotDeployment_responsibleOrgId_fkey') THEN
    ALTER TABLE "PilotDeployment" ADD CONSTRAINT "PilotDeployment_responsibleOrgId_fkey" FOREIGN KEY ("responsibleOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PilotMetric_verifiedById_fkey') THEN
    ALTER TABLE "PilotMetric" ADD CONSTRAINT "PilotMetric_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PilotVerification_organizationId_fkey') THEN
    ALTER TABLE "PilotVerification" ADD CONSTRAINT "PilotVerification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
