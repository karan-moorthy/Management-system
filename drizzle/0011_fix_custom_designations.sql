-- Drop the incorrectly created custom_designations table
DROP TABLE IF EXISTS "custom_designations" CASCADE;

-- Recreate custom_designations table with correct structure
CREATE TABLE "custom_designations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text UNIQUE NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create index
CREATE INDEX "custom_designations_name_idx" ON "custom_designations" ("name");
