-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "ai_analysis" JSONB,
ADD COLUMN     "code_quality" JSONB,
ADD COLUMN     "code_quality_score" DOUBLE PRECISION,
ADD COLUMN     "final_report" JSONB,
ADD COLUMN     "final_score" DOUBLE PRECISION,
ADD COLUMN     "requirement_score" DOUBLE PRECISION,
ADD COLUMN     "runnability" JSONB,
ADD COLUMN     "runnability_score" DOUBLE PRECISION;
