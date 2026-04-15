CREATE TYPE "public"."assessment_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."requirement_status" AS ENUM('MET', 'PARTIAL', 'NOT_MET', 'PENDING');--> statement-breakpoint
CREATE TABLE "ai_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"score" double precision NOT NULL,
	"confidence" double precision NOT NULL,
	"summary" text NOT NULL,
	CONSTRAINT "ai_analysis_assessment_id_unique" UNIQUE("assessment_id")
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"ip_hash" text NOT NULL,
	"repo_url" text NOT NULL,
	"requirements_text" text NOT NULL,
	"status" "assessment_status" DEFAULT 'PENDING' NOT NULL,
	"score" integer,
	"summary" text,
	"requirement_score" double precision,
	"code_quality_score" double precision,
	"runnability_score" double precision,
	"ai_analysis_score" double precision,
	"test_executed" boolean DEFAULT false NOT NULL,
	"test_results" jsonb,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"estimated_cost" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code_quality" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"score" double precision NOT NULL,
	"readability" double precision NOT NULL,
	"structure" double precision NOT NULL,
	"naming" double precision NOT NULL,
	"best_practices" double precision NOT NULL,
	"summary" text NOT NULL,
	"issues" text[],
	CONSTRAINT "code_quality_assessment_id_unique" UNIQUE("assessment_id")
);
--> statement-breakpoint
CREATE TABLE "commit_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"quality_score" double precision NOT NULL,
	"pattern" text NOT NULL,
	"summary" text NOT NULL,
	CONSTRAINT "commit_analysis_assessment_id_unique" UNIQUE("assessment_id")
);
--> statement-breakpoint
CREATE TABLE "final_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"score" double precision NOT NULL,
	"summary" text NOT NULL,
	"strengths" text[],
	"weaknesses" text[],
	"hiring_recommendation" text NOT NULL,
	CONSTRAINT "final_report_assessment_id_unique" UNIQUE("assessment_id")
);
--> statement-breakpoint
CREATE TABLE "interview_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"question" text NOT NULL,
	"focus_area" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ip_tracking" (
	"ip_hash" text PRIMARY KEY NOT NULL,
	"assessment_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"text" text NOT NULL,
	"category" text,
	"status" "requirement_status" DEFAULT 'PENDING' NOT NULL,
	"evidence_file" text,
	"evidence_snippet" text,
	"reasoning" text
);
--> statement-breakpoint
CREATE TABLE "runnability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"score" double precision NOT NULL,
	"has_docker" boolean NOT NULL,
	"has_env_example" boolean NOT NULL,
	"has_scripts" boolean NOT NULL,
	"ci_detected" boolean NOT NULL,
	"summary" text NOT NULL,
	"issues" text[],
	"has_tests" boolean,
	"test_language" text,
	"test_framework" text,
	"test_command" text,
	"test_path" text,
	CONSTRAINT "runnability_assessment_id_unique" UNIQUE("assessment_id")
);
--> statement-breakpoint
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_quality" ADD CONSTRAINT "code_quality_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commit_analysis" ADD CONSTRAINT "commit_analysis_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "final_report" ADD CONSTRAINT "final_report_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_requirements" ADD CONSTRAINT "project_requirements_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runnability" ADD CONSTRAINT "runnability_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;