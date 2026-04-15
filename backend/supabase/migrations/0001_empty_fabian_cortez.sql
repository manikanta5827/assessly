CREATE INDEX "repo_url_idx" ON "assessments" USING btree ("repo_url");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "assessments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ip_hash_idx" ON "assessments" USING btree ("ip_hash");--> statement-breakpoint
CREATE INDEX "status_idx" ON "assessments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "iq_assessment_id_idx" ON "interview_questions" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "pr_assessment_id_idx" ON "project_requirements" USING btree ("assessment_id");