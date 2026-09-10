-- DropForeignKey
ALTER TABLE "Collaboration" DROP CONSTRAINT IF EXISTS "Collaboration_industryId_fkey";

-- AlterTable
ALTER TABLE "Collaboration" ALTER COLUMN "problemId" SET NOT NULL,
ALTER COLUMN "industryId" SET NOT NULL,
ALTER COLUMN "supportType" SET NOT NULL,
ALTER COLUMN "supportType" SET DEFAULT 'GENERAL_INTEREST',
ALTER COLUMN "message" SET NOT NULL,
ALTER COLUMN "message" SET DEFAULT '';

-- AddForeignKey
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
