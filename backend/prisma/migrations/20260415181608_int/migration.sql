/*
  Warnings:

  - You are about to drop the column `reasoning` on the `ai_analysis` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ai_analysis" DROP COLUMN "reasoning";

-- AlterTable
ALTER TABLE "project_requirements" ADD COLUMN     "reasoning" TEXT;
