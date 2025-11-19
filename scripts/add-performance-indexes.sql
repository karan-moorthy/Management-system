-- Performance Optimization Indexes for Tasks Table
-- Run this to significantly improve query performance for 1000+ concurrent users

-- Drop existing indexes if they exist to recreate
DROP INDEX IF EXISTS tasks_workspace_status_position_idx;
DROP INDEX IF EXISTS tasks_project_status_position_idx;
DROP INDEX IF EXISTS tasks_assignee_status_created_idx;
DROP INDEX IF EXISTS tasks_status_created_idx;

-- Composite index for Kanban board queries (most critical)
-- This index speeds up: SELECT * FROM tasks WHERE workspace_id = X AND status = Y ORDER BY position
CREATE INDEX IF NOT EXISTS tasks_workspace_status_position_idx 
  ON tasks(workspace_id, status, position) 
  WHERE workspace_id IS NOT NULL;

-- Composite index for project-specific Kanban views
CREATE INDEX IF NOT EXISTS tasks_project_status_position_idx 
  ON tasks(project_id, status, position) 
  WHERE project_id IS NOT NULL;

-- Composite index for assignee filtering with status
CREATE INDEX IF NOT EXISTS tasks_assignee_status_created_idx 
  ON tasks(assignee_id, status, created) 
  WHERE assignee_id IS NOT NULL;

-- Index for status + created (for dashboard queries)
CREATE INDEX IF NOT EXISTS tasks_status_created_idx 
  ON tasks(status, created DESC);

-- Partial index for overdue tasks (common query)
-- Using a simpler predicate without CURRENT_TIMESTAMP
CREATE INDEX IF NOT EXISTS tasks_overdue_idx 
  ON tasks(due_date, status) 
  WHERE status != 'Done';

-- Index for search optimization (if using PostgreSQL full-text search)
-- Requires pg_trgm extension
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
  ) THEN
    CREATE EXTENSION pg_trgm;
  END IF;
END $$;

-- GIN index for fast text search on summary
CREATE INDEX IF NOT EXISTS tasks_summary_trgm_idx 
  ON tasks USING gin(summary gin_trgm_ops);

-- GIN index for fast text search on description
CREATE INDEX IF NOT EXISTS tasks_description_trgm_idx 
  ON tasks USING gin(description gin_trgm_ops);

-- Analyze the table to update statistics
ANALYZE tasks;
