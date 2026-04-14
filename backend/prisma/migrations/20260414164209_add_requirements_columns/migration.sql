/*
  Warnings:

  - You are about to drop the column `code_review` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `summary_text` on the `assessments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "assessments" DROP COLUMN "code_review",
DROP COLUMN "summary_text",
ADD COLUMN     "requirements" JSONB,
ADD COLUMN     "requirements_evaluation" JSONB,
ADD COLUMN     "summary" TEXT;
