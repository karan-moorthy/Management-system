-- Add projectId column to members table for CLIENT role scoping
ALTER TABLE "members" ADD COLUMN "project_id" uuid REFERENCES "projects"("id") ON DELETE CASCADE;

-- Create index for project-scoped members
CREATE INDEX "members_project_idx" ON "members"("project_id");

-- Create client_invitations table for secure email invitations
CREATE TABLE IF NOT EXISTS "client_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
	"workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
	"invited_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"token" text NOT NULL UNIQUE,
	"status" text NOT NULL DEFAULT 'pending',
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for client_invitations
CREATE INDEX "client_invitations_email_idx" ON "client_invitations"("email");
CREATE INDEX "client_invitations_project_idx" ON "client_invitations"("project_id");
CREATE INDEX "client_invitations_token_idx" ON "client_invitations"("token");
CREATE INDEX "client_invitations_status_idx" ON "client_invitations"("status");
