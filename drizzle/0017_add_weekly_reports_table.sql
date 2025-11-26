-- Add weekly_reports table for employee weekly report submissions
CREATE TABLE IF NOT EXISTS "weekly_reports" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "from_date" TIMESTAMP NOT NULL,
  "to_date" TIMESTAMP NOT NULL,
  "department" TEXT NOT NULL,
  "daily_descriptions" JSONB NOT NULL DEFAULT '{}',
  "uploaded_files" JSONB NOT NULL DEFAULT '[]',
  "status" TEXT NOT NULL DEFAULT 'submitted',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "weekly_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "weekly_reports_user_id_idx" ON "weekly_reports" ("user_id");
CREATE INDEX IF NOT EXISTS "weekly_reports_department_idx" ON "weekly_reports" ("department");
CREATE INDEX IF NOT EXISTS "weekly_reports_from_date_idx" ON "weekly_reports" ("from_date");
CREATE INDEX IF NOT EXISTS "weekly_reports_to_date_idx" ON "weekly_reports" ("to_date");
CREATE INDEX IF NOT EXISTS "weekly_reports_created_at_idx" ON "weekly_reports" ("created_at");
