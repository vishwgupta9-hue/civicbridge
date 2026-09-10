-- DropForeignKey
ALTER TABLE "Collaboration" DROP CONSTRAINT "Collaboration_industryId_fkey";

-- AlterTable
ALTER TABLE "Collaboration" ALTER COLUMN "problemId" DROP NOT NULL,
ALTER COLUMN "industryId" DROP NOT NULL,
ALTER COLUMN "supportType" DROP NOT NULL,
ALTER COLUMN "message" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "collaborationId" TEXT,
ADD COLUMN     "responsibleParty" TEXT,
ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProgressUpdate" ADD COLUMN     "collaborationId" TEXT;

-- CreateIndex
CREATE INDEX "Milestone_collaborationId_idx" ON "Milestone"("collaborationId");

-- CreateIndex
CREATE INDEX "ProgressUpdate_collaborationId_idx" ON "ProgressUpdate"("collaborationId");

-- AddForeignKey
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressUpdate" ADD CONSTRAINT "ProgressUpdate_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_collaborationId_fkey" FOREIGN KEY ("collaborationId") REFERENCES "Collaboration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
