/*
  Warnings:

  - You are about to drop the column `repo_map` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `repo_snapshot` on the `assessments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "assessments" DROP COLUMN "repo_map",
DROP COLUMN "repo_snapshot";
