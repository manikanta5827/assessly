/*
  Warnings:

  - You are about to drop the column `raw_llm_response` on the `assessments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "assessments" DROP COLUMN "raw_llm_response";
