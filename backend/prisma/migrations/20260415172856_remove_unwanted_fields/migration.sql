/*
  Warnings:

  - You are about to drop the column `generic_patterns` on the `ai_analysis` table. All the data in the column will be lost.
  - You are about to drop the column `low_iteration_evidence` on the `ai_analysis` table. All the data in the column will be lost.
  - You are about to drop the column `uniform_style` on the `ai_analysis` table. All the data in the column will be lost.
  - You are about to drop the column `reasoning` on the `commit_analysis` table. All the data in the column will be lost.
  - You are about to drop the column `confidence` on the `project_requirements` table. All the data in the column will be lost.
  - You are about to drop the column `requirement_id` on the `project_requirements` table. All the data in the column will be lost.
  - You are about to drop the column `suggested_files` on the `project_requirements` table. All the data in the column will be lost.
  - You are about to drop the column `test_reason` on the `runnability` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ai_analysis" DROP COLUMN "generic_patterns",
DROP COLUMN "low_iteration_evidence",
DROP COLUMN "uniform_style";

-- AlterTable
ALTER TABLE "commit_analysis" DROP COLUMN "reasoning";

-- AlterTable
ALTER TABLE "project_requirements" DROP COLUMN "confidence",
DROP COLUMN "requirement_id",
DROP COLUMN "suggested_files";

-- AlterTable
ALTER TABLE "runnability" DROP COLUMN "test_reason";
