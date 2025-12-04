-- Create custom bug types table
CREATE TABLE IF NOT EXISTS "custom_bug_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now()
);

-- Create bug tracker table
CREATE TABLE IF NOT EXISTS "bugs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bug_id" text NOT NULL UNIQUE,
	"assigned_to" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"bug_type" text NOT NULL DEFAULT 'Development',
	"bug_description" text NOT NULL,
	"file_url" text,
	"status" text NOT NULL DEFAULT 'Open',
	"priority" text DEFAULT 'Medium',
	"reported_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"reported_by_name" text NOT NULL,
	"workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE CASCADE,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "bugs_bug_id_idx" ON "bugs" ("bug_id");
CREATE INDEX IF NOT EXISTS "bugs_assigned_to_idx" ON "bugs" ("assigned_to");
CREATE INDEX IF NOT EXISTS "bugs_bug_type_idx" ON "bugs" ("bug_type");
CREATE INDEX IF NOT EXISTS "bugs_status_idx" ON "bugs" ("status");
CREATE INDEX IF NOT EXISTS "bugs_reported_by_idx" ON "bugs" ("reported_by");
CREATE INDEX IF NOT EXISTS "bugs_workspace_idx" ON "bugs" ("workspace_id");
CREATE INDEX IF NOT EXISTS "bugs_created_at_idx" ON "bugs" ("created_at");
CREATE INDEX IF NOT EXISTS "custom_bug_types_name_idx" ON "custom_bug_types" ("name");

-- Insert default bug types
INSERT INTO "custom_bug_types" ("name") VALUES ('UI/UX'), ('Development'), ('Testing')
ON CONFLICT (name) DO NOTHING;
