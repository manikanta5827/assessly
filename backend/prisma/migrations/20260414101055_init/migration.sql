/*
  Warnings:

  - You are about to drop the column `summary` on the `assessments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "assessments" DROP COLUMN "summary",
ADD COLUMN     "code_review" JSONB,
ADD COLUMN     "summary_text" TEXT;
