/*
  Warnings:

  - You are about to drop the column `ai_analysis` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `code_quality` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `commit_analysis` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `final_report` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `interview_questions` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `requirements` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `requirements_evaluation` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `runnability` on the `assessments` table. All the data in the column will be lost.
  - You are about to drop the column `test_detection` on the `assessments` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('MET', 'PARTIAL', 'NOT_MET', 'PENDING');

-- AlterTable
ALTER TABLE "assessments" DROP COLUMN "ai_analysis",
DROP COLUMN "code_quality",
DROP COLUMN "commit_analysis",
DROP COLUMN "final_report",
DROP COLUMN "interview_questions",
DROP COLUMN "requirements",
DROP COLUMN "requirements_evaluation",
DROP COLUMN "runnability",
DROP COLUMN "test_detection";

-- CreateTable
CREATE TABLE "requirements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessmentId" UUID NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT,
    "suggested_files" TEXT[],
    "status" "RequirementStatus" NOT NULL DEFAULT 'PENDING',
    "confidence" DOUBLE PRECISION,
    "evidence_file" TEXT,
    "evidence_snippet" TEXT,
    "reasoning" TEXT,

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_code_quality" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessmentId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "readability" DOUBLE PRECISION NOT NULL,
    "structure" DOUBLE PRECISION NOT NULL,
    "naming" DOUBLE PRECISION NOT NULL,
    "best_practices" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "issues" TEXT[],

    CONSTRAINT "assessment_code_quality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_runnability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessmentId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "has_docker" BOOLEAN NOT NULL,
    "has_env_example" BOOLEAN NOT NULL,
    "has_scripts" BOOLEAN NOT NULL,
    "ci_detected" BOOLEAN NOT NULL,
    "summary" TEXT NOT NULL,
    "issues" TEXT[],
    "has_tests" BOOLEAN,
    "test_language" TEXT,
    "test_framework" TEXT,
    "test_command" TEXT,
    "test_path" TEXT,
    "test_reason" TEXT,

    CONSTRAINT "assessment_runnability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_ai_analysis" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessmentId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "uniform_style" BOOLEAN NOT NULL,
    "low_iteration_evidence" BOOLEAN NOT NULL,
    "generic_patterns" BOOLEAN NOT NULL,
    "commit_mismatch" BOOLEAN NOT NULL,
    "summary" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,

    CONSTRAINT "assessment_ai_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_commit_analysis" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessmentId" UUID NOT NULL,
    "quality_score" DOUBLE PRECISION NOT NULL,
    "pattern" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,

    CONSTRAINT "assessment_commit_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_final_report" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessmentId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "hiring_recommendation" TEXT NOT NULL,

    CONSTRAINT "assessment_final_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessmentId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "focus_area" TEXT NOT NULL,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_code_quality_assessmentId_key" ON "assessment_code_quality"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_runnability_assessmentId_key" ON "assessment_runnability"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_ai_analysis_assessmentId_key" ON "assessment_ai_analysis"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_commit_analysis_assessmentId_key" ON "assessment_commit_analysis"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_final_report_assessmentId_key" ON "assessment_final_report"("assessmentId");

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_code_quality" ADD CONSTRAINT "assessment_code_quality_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_runnability" ADD CONSTRAINT "assessment_runnability_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_ai_analysis" ADD CONSTRAINT "assessment_ai_analysis_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_commit_analysis" ADD CONSTRAINT "assessment_commit_analysis_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_final_report" ADD CONSTRAINT "assessment_final_report_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
