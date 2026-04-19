CREATE TABLE "assessment_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"description" text,
	"assessment_text" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_reset_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_repo_url" text NOT NULL,
	"assessment_template_id" uuid NOT NULL,
	"status" "assessment_status" DEFAULT 'PENDING' NOT NULL,
	"score" integer,
	"summary" text,
	"requirement_score" double precision,
	"code_quality_score" double precision,
	"runnability_score" double precision,
	"ai_analysis_score" double precision,
	"full_report" jsonb,
	"test_executed" boolean DEFAULT false NOT NULL,
	"test_results" jsonb,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"estimated_cost" numeric(10, 6),
	"candidate_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "ai_analysis" CASCADE;--> statement-breakpoint
DROP TABLE "assessments" CASCADE;--> statement-breakpoint
DROP TABLE "channels" CASCADE;--> statement-breakpoint
DROP TABLE "code_quality" CASCADE;--> statement-breakpoint
DROP TABLE "commit_analysis" CASCADE;--> statement-breakpoint
DROP TABLE "email_candidates" CASCADE;--> statement-breakpoint
DROP TABLE "final_report" CASCADE;--> statement-breakpoint
DROP TABLE "interview_questions" CASCADE;--> statement-breakpoint
DROP TABLE "project_requirements" CASCADE;--> statement-breakpoint
DROP TABLE "runnability" CASCADE;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_created_by_guest_usage_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."guest_usage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assessment_template_id_assessment_templates_id_fk" FOREIGN KEY ("assessment_template_id") REFERENCES "public"."assessment_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_templates_created_by_idx" ON "assessment_templates" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "guest_usage_ip_address_idx" ON "guest_usage" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "github_repo_url_idx" ON "submissions" USING btree ("github_repo_url");--> statement-breakpoint
CREATE INDEX "status_idx" ON "submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "assessment_template_id_idx" ON "submissions" USING btree ("assessment_template_id");