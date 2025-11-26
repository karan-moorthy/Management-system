-- Add isDraft column to weekly_reports table
ALTER TABLE "weekly_reports" ADD COLUMN "is_draft" text DEFAULT 'false' NOT NULL;

-- Create index on isDraft column for better query performance
CREATE INDEX IF NOT EXISTS "weekly_reports_is_draft_idx" ON "weekly_reports" ("is_draft");
