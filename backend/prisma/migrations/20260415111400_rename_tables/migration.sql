/*
  Warnings:

  - You are about to drop the `assessment_ai_analysis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `assessment_code_quality` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `assessment_commit_analysis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `assessment_final_report` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `assessment_runnability` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `requirements` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "assessment_ai_analysis" DROP CONSTRAINT "assessment_ai_analysis_assessmentId_fkey";

-- DropForeignKey
ALTER TABLE "assessment_code_quality" DROP CONSTRAINT "assessment_code_quality_assessmentId_fkey";

-- DropForeignKey
ALTER TABLE "assessment_commit_analysis" DROP CONSTRAINT "assessment_commit_analysis_assessmentId_fkey";

-- DropForeignKey
ALTER TABLE "assessment_final_report" DROP CONSTRAINT "assessment_final_report_assessmentId_fkey";

-- DropForeignKey
ALTER TABLE "assessment_runnability" DROP CONSTRAINT "assessment_runnability_assessmentId_fkey";

-- DropForeignKey
ALTER TABLE "requirements" DROP CONSTRAINT "requirements_assessmentId_fkey";

-- DropTable
DROP TABLE "assessment_ai_analysis";

-- DropTable
DROP TABLE "assessment_code_quality";

-- DropTable
DROP TABLE "assessment_commit_analysis";

-- DropTable
DROP TABLE "assessment_final_report";

-- DropTable
DROP TABLE "assessment_runnability";

-- DropTable
DROP TABLE "requirements";

-- CreateTable
CREATE TABLE "project_requirements" (
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

    CONSTRAINT "project_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_quality" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessmentId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "readability" DOUBLE PRECISION NOT NULL,
    "structure" DOUBLE PRECISION NOT NULL,
    "naming" DOUBLE PRECISION NOT NULL,
    "best_practices" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "issues" TEXT[],

    CONSTRAINT "code_quality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runnability" (
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

    CONSTRAINT "runnability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis" (
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

    CONSTRAINT "ai_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commit_analysis" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessmentId" UUID NOT NULL,
    "quality_score" DOUBLE PRECISION NOT NULL,
    "pattern" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,

    CONSTRAINT "commit_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_report" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assessmentId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "hiring_recommendation" TEXT NOT NULL,

    CONSTRAINT "final_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "code_quality_assessmentId_key" ON "code_quality"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "runnability_assessmentId_key" ON "runnability"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analysis_assessmentId_key" ON "ai_analysis"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "commit_analysis_assessmentId_key" ON "commit_analysis"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "final_report_assessmentId_key" ON "final_report"("assessmentId");

-- AddForeignKey
ALTER TABLE "project_requirements" ADD CONSTRAINT "project_requirements_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_quality" ADD CONSTRAINT "code_quality_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runnability" ADD CONSTRAINT "runnability_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commit_analysis" ADD CONSTRAINT "commit_analysis_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_report" ADD CONSTRAINT "final_report_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
