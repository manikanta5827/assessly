-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT,
    "ip_hash" TEXT NOT NULL,
    "repo_url" TEXT NOT NULL,
    "requirements_text" TEXT NOT NULL,
    "repo_snapshot" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "ai_usage_detection" JSONB,
    "summary" JSONB,
    "interview_questions" JSONB,
    "test_detection" JSONB,
    "repo_map" JSONB,
    "test_executed" BOOLEAN NOT NULL DEFAULT false,
    "test_results" JSONB,
    "raw_llm_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ip_tracking" (
    "ip_hash" TEXT NOT NULL,
    "assessment_count" INTEGER NOT NULL DEFAULT 0,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ip_tracking_pkey" PRIMARY KEY ("ip_hash")
);
