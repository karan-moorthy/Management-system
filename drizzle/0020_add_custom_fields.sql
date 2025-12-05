-- Custom field definitions table (similar to Jira's custom fields)
CREATE TABLE IF NOT EXISTS "custom_field_definitions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "field_name" TEXT NOT NULL, -- e.g., "Sprint", "Story Points", "Epic Link"
  "field_key" TEXT NOT NULL, -- e.g., "sprint", "story_points", "epic_link" (for API/DB usage)
  "field_type" TEXT NOT NULL, -- TEXT, NUMBER, DATE, SELECT, MULTI_SELECT, USER, CHECKBOX, URL, etc.
  "field_description" TEXT,
  "is_required" BOOLEAN DEFAULT FALSE,
  "default_value" TEXT,
  
  -- Configuration for different field types
  "field_options" JSONB, -- For SELECT/MULTI_SELECT: {options: ["Option 1", "Option 2"]}
  "validation_rules" JSONB, -- {min: 0, max: 100, pattern: "^[A-Z]", etc}
  
  -- Applicability
  "applies_to_issue_types" JSONB, -- Array of issue types: ["Task", "Bug", "Story", "Epic"]
  "applies_to_projects" JSONB, -- Array of project IDs (null means all projects)
  
  -- UI Configuration
  "display_order" INTEGER DEFAULT 1000,
  "is_visible_in_list" BOOLEAN DEFAULT FALSE, -- Show in task list/table
  "is_visible_in_detail" BOOLEAN DEFAULT TRUE, -- Show in detail view
  "is_searchable" BOOLEAN DEFAULT TRUE,
  "is_filterable" BOOLEAN DEFAULT TRUE,
  
  -- System fields
  "is_system_field" BOOLEAN DEFAULT FALSE, -- True for built-in fields like Priority, Status
  "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  
  CONSTRAINT "custom_field_unique_key_per_workspace" UNIQUE ("workspace_id", "field_key")
);

-- Custom field values table (stores actual values for each task)
CREATE TABLE IF NOT EXISTS "custom_field_values" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "field_definition_id" UUID NOT NULL REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE,
  "value" TEXT, -- String value for simple types
  "value_number" NUMERIC, -- Numeric value
  "value_date" TIMESTAMP, -- Date value
  "value_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL, -- User reference value
  "value_json" JSONB, -- Complex values (arrays, objects, multi-select)
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  
  CONSTRAINT "custom_field_value_unique_per_task" UNIQUE ("task_id", "field_definition_id")
);

-- Issue type configurations (like Jira's issue type schemes)
CREATE TABLE IF NOT EXISTS "issue_type_configs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "issue_type_name" TEXT NOT NULL, -- Task, Bug, Story, Epic, Sub-task, etc.
  "issue_type_key" TEXT NOT NULL, -- task, bug, story, epic (for API usage)
  "description" TEXT,
  "icon" TEXT, -- Icon name or emoji
  "color" TEXT, -- Hex color code
  "is_subtask_type" BOOLEAN DEFAULT FALSE,
  "workflow_id" UUID, -- Reference to workflow (future enhancement)
  "display_order" INTEGER DEFAULT 1000,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  
  CONSTRAINT "issue_type_unique_key_per_workspace" UNIQUE ("workspace_id", "issue_type_key")
);

-- Workflow definitions (Jira-like workflows)
CREATE TABLE IF NOT EXISTS "workflows" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "statuses" JSONB NOT NULL, -- Array of status objects: [{key: "todo", name: "To Do", category: "TODO"}, ...]
  "transitions" JSONB NOT NULL, -- Workflow transitions: [{from: "todo", to: "in_progress", name: "Start Progress"}, ...]
  "is_default" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Board configurations (Kanban/Scrum boards)
CREATE TABLE IF NOT EXISTS "board_configs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "project_id" UUID REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "board_type" TEXT NOT NULL DEFAULT 'KANBAN', -- KANBAN, SCRUM
  "description" TEXT,
  
  -- Column configuration
  "columns" JSONB NOT NULL, -- Array of column configs: [{id, name, status_mapping: [], limit: 5}]
  
  -- Filter configuration
  "filter_config" JSONB, -- {issue_types: [], assignees: [], etc}
  
  -- Display settings
  "card_color_by" TEXT DEFAULT 'PRIORITY', -- PRIORITY, ISSUE_TYPE, ASSIGNEE, CUSTOM_FIELD
  "swimlanes_by" TEXT, -- NONE, ASSIGNEE, PRIORITY, EPIC, CUSTOM_FIELD
  
  -- Scrum specific
  "sprint_duration_weeks" INTEGER,
  
  "is_favorite" BOOLEAN DEFAULT FALSE,
  "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Sprints table (for Scrum boards)
CREATE TABLE IF NOT EXISTS "sprints" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "board_id" UUID NOT NULL REFERENCES "board_configs"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "goal" TEXT,
  "start_date" TIMESTAMP,
  "end_date" TIMESTAMP,
  "state" TEXT NOT NULL DEFAULT 'FUTURE', -- FUTURE, ACTIVE, CLOSED
  "completed_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Sprint task assignments
CREATE TABLE IF NOT EXISTS "sprint_tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sprint_id" UUID NOT NULL REFERENCES "sprints"("id") ON DELETE CASCADE,
  "task_id" UUID NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "added_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "removed_at" TIMESTAMP,
  
  CONSTRAINT "sprint_task_unique" UNIQUE ("sprint_id", "task_id")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "custom_field_definitions_workspace_idx" ON "custom_field_definitions"("workspace_id");
CREATE INDEX IF NOT EXISTS "custom_field_definitions_field_key_idx" ON "custom_field_definitions"("field_key");
CREATE INDEX IF NOT EXISTS "custom_field_values_task_idx" ON "custom_field_values"("task_id");
CREATE INDEX IF NOT EXISTS "custom_field_values_field_definition_idx" ON "custom_field_values"("field_definition_id");
CREATE INDEX IF NOT EXISTS "issue_type_configs_workspace_idx" ON "issue_type_configs"("workspace_id");
CREATE INDEX IF NOT EXISTS "workflows_workspace_idx" ON "workflows"("workspace_id");
CREATE INDEX IF NOT EXISTS "board_configs_workspace_idx" ON "board_configs"("workspace_id");
CREATE INDEX IF NOT EXISTS "board_configs_project_idx" ON "board_configs"("project_id");
CREATE INDEX IF NOT EXISTS "sprints_workspace_idx" ON "sprints"("workspace_id");
CREATE INDEX IF NOT EXISTS "sprints_board_idx" ON "sprints"("board_id");
CREATE INDEX IF NOT EXISTS "sprints_state_idx" ON "sprints"("state");
CREATE INDEX IF NOT EXISTS "sprint_tasks_sprint_idx" ON "sprint_tasks"("sprint_id");
CREATE INDEX IF NOT EXISTS "sprint_tasks_task_idx" ON "sprint_tasks"("task_id");

-- Insert default system field definitions for each workspace
-- (This would be done via application code when workspace is created)

-- Example: Insert default issue types
INSERT INTO "issue_type_configs" ("workspace_id", "issue_type_name", "issue_type_key", "description", "icon", "color", "display_order")
SELECT 
  w.id,
  issue_types.name,
  issue_types.key,
  issue_types.description,
  issue_types.icon,
  issue_types.color,
  issue_types.display_order
FROM "workspaces" w
CROSS JOIN (
  VALUES 
    ('Task', 'task', 'A unit of work to be completed', '✓', '#4BADE8', 1),
    ('Bug', 'bug', 'A problem that impairs functionality', '🐛', '#E5493A', 2),
    ('Story', 'story', 'A user story or feature request', '📖', '#63BA3C', 3),
    ('Epic', 'epic', 'A large body of work', '⚡', '#904EE2', 4),
    ('Sub-task', 'subtask', 'A smaller task within a task', '📋', '#6B778C', 5)
) AS issue_types(name, key, description, icon, color, display_order)
ON CONFLICT ("workspace_id", "issue_type_key") DO NOTHING;
