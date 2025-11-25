-- Make project_name nullable for individual tasks
ALTER TABLE "tasks" ALTER COLUMN "project_name" DROP NOT NULL;
