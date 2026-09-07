-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'ADMIN', 'UNIVERSITY', 'INDUSTRY', 'STARTUP');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('UNIVERSITY', 'INDUSTRY', 'STARTUP');

-- CreateEnum
CREATE TYPE "PriorityTier" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('AI_SCREENED', 'GOVERNMENT_VERIFIED', 'DECLINED_BY_GOVT');

-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FilterStatus" AS ENUM ('PENDING', 'PASSED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "SupportType" AS ENUM ('MENTORSHIP', 'TECHNICAL', 'PROTOTYPING', 'GENERAL_INTEREST');

-- CreateEnum
CREATE TYPE "VentureStage" AS ENUM ('PROBLEM_CLAIMED', 'CONCEPT_SUBMITTED', 'SUPPORT_REQUESTED', 'SUPPORT_GRANTED', 'BUILDING', 'PILOTED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CollaborationStatus" AS ENUM ('INTERESTED', 'ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "phone" TEXT,
    "district" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "regCode" TEXT,
    "domainTags" TEXT[],
    "expertiseTags" TEXT[],
    "district" TEXT,
    "state" TEXT NOT NULL DEFAULT 'Jharkhand',
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "district" TEXT NOT NULL,
    "locationText" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "affectedCount" INTEGER NOT NULL DEFAULT 1,
    "evidenceUrl" TEXT,
    "status" "ProblemStatus" NOT NULL DEFAULT 'OPEN',
    "filterStatus" "FilterStatus" NOT NULL DEFAULT 'PENDING',
    "filterReason" TEXT,
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "priorityTier" "PriorityTier" NOT NULL DEFAULT 'LOW',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'AI_SCREENED',
    "verificationNotes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verificationRequested" BOOLEAN NOT NULL DEFAULT false,
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "predictedCategory" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "aiSummary" TEXT NOT NULL,
    "severityScore" INTEGER NOT NULL,
    "affectedPeopleScore" INTEGER NOT NULL,
    "frequencyScore" INTEGER NOT NULL,
    "evidenceScore" INTEGER NOT NULL,
    "urgencyScore" INTEGER NOT NULL,
    "aiUrgencyScore" INTEGER NOT NULL,
    "aiUrgencyReason" TEXT NOT NULL,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateSimilarity" DOUBLE PRECISION,
    "similarProblemIds" TEXT[],
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Validation" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "severityScore" INTEGER NOT NULL,
    "affectedScore" INTEGER NOT NULL,
    "frequencyScore" INTEGER NOT NULL,
    "evidenceScore" INTEGER NOT NULL,
    "urgencyScore" INTEGER NOT NULL,
    "decision" "VerificationStatus" NOT NULL,
    "remarks" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "facultyMentor" TEXT NOT NULL,
    "teamMembers" JSONB NOT NULL,
    "proposedApproach" TEXT NOT NULL,
    "deliverables" TEXT NOT NULL,
    "timelineStart" TIMESTAMP(3) NOT NULL,
    "timelineEnd" TIMESTAMP(3) NOT NULL,
    "milestones" JSONB NOT NULL,
    "budgetRequired" DOUBLE PRECISION,
    "status" "ProposalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessConcept" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "solutionDescription" TEXT NOT NULL,
    "targetBeneficiaries" TEXT NOT NULL,
    "marketSize" TEXT,
    "businessModel" TEXT NOT NULL,
    "revenueModel" TEXT NOT NULL,
    "sustainabilityModel" TEXT NOT NULL,
    "currentStage" "VentureStage" NOT NULL DEFAULT 'PROBLEM_CLAIMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "businessConceptId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "requestedFrom" "Role" NOT NULL,
    "requestType" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "responseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collaboration" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "supportType" "SupportType" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "CollaborationStatus" NOT NULL DEFAULT 'INTERESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collaboration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressUpdate" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT,
    "businessConceptId" TEXT,
    "updateText" TEXT NOT NULL,
    "milestoneTitle" TEXT,
    "attachmentUrl" TEXT,
    "postedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Organization_type_idx" ON "Organization"("type");

-- CreateIndex
CREATE INDEX "Problem_filterStatus_idx" ON "Problem"("filterStatus");

-- CreateIndex
CREATE INDEX "Problem_status_idx" ON "Problem"("status");

-- CreateIndex
CREATE INDEX "Problem_verificationStatus_idx" ON "Problem"("verificationStatus");

-- CreateIndex
CREATE INDEX "Problem_priorityTier_idx" ON "Problem"("priorityTier");

-- CreateIndex
CREATE INDEX "Problem_district_idx" ON "Problem"("district");

-- CreateIndex
CREATE INDEX "Problem_category_idx" ON "Problem"("category");

-- CreateIndex
CREATE UNIQUE INDEX "AIAnalysis_problemId_key" ON "AIAnalysis"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "Validation_problemId_key" ON "Validation"("problemId");

-- CreateIndex
CREATE INDEX "Proposal_problemId_idx" ON "Proposal"("problemId");

-- CreateIndex
CREATE INDEX "Proposal_universityId_idx" ON "Proposal"("universityId");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE INDEX "BusinessConcept_problemId_idx" ON "BusinessConcept"("problemId");

-- CreateIndex
CREATE INDEX "BusinessConcept_startupId_idx" ON "BusinessConcept"("startupId");

-- CreateIndex
CREATE INDEX "Collaboration_problemId_idx" ON "Collaboration"("problemId");

-- CreateIndex
CREATE INDEX "Collaboration_industryId_idx" ON "Collaboration"("industryId");

-- CreateIndex
CREATE INDEX "Collaboration_status_idx" ON "Collaboration"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessConcept" ADD CONSTRAINT "BusinessConcept_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessConcept" ADD CONSTRAINT "BusinessConcept_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_businessConceptId_fkey" FOREIGN KEY ("businessConceptId") REFERENCES "BusinessConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressUpdate" ADD CONSTRAINT "ProgressUpdate_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressUpdate" ADD CONSTRAINT "ProgressUpdate_businessConceptId_fkey" FOREIGN KEY ("businessConceptId") REFERENCES "BusinessConcept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressUpdate" ADD CONSTRAINT "ProgressUpdate_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce ProgressUpdate XOR parent: exactly one of proposalId or businessConceptId must be populated
ALTER TABLE "ProgressUpdate"
ADD CONSTRAINT "progress_update_xor_parent"
CHECK (
  ("proposalId" IS NOT NULL AND "businessConceptId" IS NULL) OR
  ("proposalId" IS NULL AND "businessConceptId" IS NOT NULL)
);

