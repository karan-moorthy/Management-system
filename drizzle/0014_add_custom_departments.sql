-- Migration: Add custom_departments table
-- Created: 2025-11-18

CREATE TABLE IF NOT EXISTS "custom_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "custom_departments_name_idx" ON "custom_departments" ("name");
