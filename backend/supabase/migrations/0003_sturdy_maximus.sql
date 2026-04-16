CREATE TYPE "public"."candidate_status" AS ENUM('INVITED', 'VIEWED', 'SUBMITTED', 'PROCESSING', 'COMPLETED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"assessment_docs_url" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "ip_tracking" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "ip_tracking" CASCADE;--> statement-breakpoint
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "user_id_idx";--> statement-breakpoint
DROP INDEX "ip_hash_idx";--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "channel_id" uuid;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "candidate_name" text;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "candidate_email" text;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "invite_token" text;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "candidate_status" "candidate_status" DEFAULT 'INVITED' NOT NULL;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "invited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assessments" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channels_created_by_idx" ON "channels" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_id_idx" ON "assessments" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "invite_token_idx" ON "assessments" USING btree ("invite_token");--> statement-breakpoint
ALTER TABLE "assessments" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "assessments" DROP COLUMN "ip_hash";--> statement-breakpoint
ALTER TABLE "assessments" DROP COLUMN "requirements_text";--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_invite_token_unique" UNIQUE("invite_token");