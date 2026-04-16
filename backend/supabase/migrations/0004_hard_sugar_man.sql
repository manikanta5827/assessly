CREATE TABLE "email_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"channel_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"status" "candidate_status" DEFAULT 'INVITED' NOT NULL,
	"invited_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessments" DROP CONSTRAINT "assessments_invite_token_unique";--> statement-breakpoint
DROP INDEX "invite_token_idx";--> statement-breakpoint
ALTER TABLE "assessments" ALTER COLUMN "channel_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "email_candidates" ADD CONSTRAINT "email_candidates_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_candidates" ADD CONSTRAINT "email_candidates_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidate_channel_id_idx" ON "email_candidates" USING btree ("channel_id");--> statement-breakpoint
ALTER TABLE "assessments" DROP COLUMN "candidate_email";--> statement-breakpoint
ALTER TABLE "assessments" DROP COLUMN "invite_token";--> statement-breakpoint
ALTER TABLE "assessments" DROP COLUMN "candidate_status";--> statement-breakpoint
ALTER TABLE "assessments" DROP COLUMN "invited_at";--> statement-breakpoint
ALTER TABLE "assessments" DROP COLUMN "viewed_at";--> statement-breakpoint
ALTER TABLE "assessments" DROP COLUMN "submitted_at";