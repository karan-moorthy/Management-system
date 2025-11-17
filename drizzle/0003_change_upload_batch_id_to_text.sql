-- Change upload_batch_id column type from UUID to TEXT
ALTER TABLE "tasks" ALTER COLUMN "upload_batch_id" TYPE TEXT;
