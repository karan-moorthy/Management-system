-- Add parent_task_id column to tasks table for hierarchical relationships
ALTER TABLE "tasks" ADD COLUMN "parent_task_id" uuid;

-- Add foreign key constraint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" 
  FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE cascade ON UPDATE no action;

-- Create index for parent_task_id
CREATE INDEX IF NOT EXISTS "tasks_parent_task_idx" ON "tasks" ("parent_task_id");
