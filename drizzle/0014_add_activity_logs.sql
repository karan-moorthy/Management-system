-- Migration: Add activity_logs table for Jira-style activity tracking
-- Created: 2025-11-19

CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "action_type" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "user_name" text NOT NULL,
  "workspace_id" uuid,
  "project_id" uuid,
  "task_id" uuid,
  "changes" jsonb,
  "summary" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "activity_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
  CONSTRAINT "activity_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL,
  CONSTRAINT "activity_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS "activity_logs_entity_idx" ON "activity_logs" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "activity_logs_user_idx" ON "activity_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "activity_logs_workspace_idx" ON "activity_logs" ("workspace_id");
CREATE INDEX IF NOT EXISTS "activity_logs_task_idx" ON "activity_logs" ("task_id");
CREATE INDEX IF NOT EXISTS "activity_logs_project_idx" ON "activity_logs" ("project_id");
CREATE INDEX IF NOT EXISTS "activity_logs_created_at_idx" ON "activity_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "activity_logs_action_type_idx" ON "activity_logs" ("action_type");
CREATE INDEX IF NOT EXISTS "activity_logs_workspace_created_idx" ON "activity_logs" ("workspace_id", "created_at");

-- Add comment
COMMENT ON TABLE "activity_logs" IS 'Jira-style comprehensive activity tracking for all entity changes';
