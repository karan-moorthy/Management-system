-- Create board_columns table for dynamic Jira-style columns
CREATE TABLE IF NOT EXISTS "board_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"color" text DEFAULT '#808080',
	"category" text DEFAULT 'TODO' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign keys
ALTER TABLE "board_columns" ADD CONSTRAINT "board_columns_workspace_id_workspaces_id_fk" 
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes
CREATE INDEX IF NOT EXISTS "board_columns_workspace_idx" ON "board_columns" ("workspace_id");
CREATE INDEX IF NOT EXISTS "board_columns_position_idx" ON "board_columns" ("position");
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_column_unique" ON "board_columns" ("workspace_id","name");

-- Insert default columns for existing workspaces
INSERT INTO "board_columns" ("workspace_id", "name", "position", "color", "category", "is_default")
SELECT 
  id as workspace_id,
  'To Do' as name,
  0 as position,
  '#6B7280' as color,
  'TODO' as category,
  true as is_default
FROM "workspaces"
ON CONFLICT DO NOTHING;

INSERT INTO "board_columns" ("workspace_id", "name", "position", "color", "category", "is_default")
SELECT 
  id as workspace_id,
  'In Progress' as name,
  1 as position,
  '#3B82F6' as color,
  'IN_PROGRESS' as category,
  true as is_default
FROM "workspaces"
ON CONFLICT DO NOTHING;

INSERT INTO "board_columns" ("workspace_id", "name", "position", "color", "category", "is_default")
SELECT 
  id as workspace_id,
  'Done' as name,
  2 as position,
  '#10B981' as color,
  'DONE' as category,
  true as is_default
FROM "workspaces"
ON CONFLICT DO NOTHING;
