-- Create list_view_columns table for dynamic column configuration
CREATE TABLE IF NOT EXISTS "list_view_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"field_name" text NOT NULL, -- The task field this column maps to (e.g., 'issueId', 'summary', 'status')
	"display_name" text NOT NULL, -- Display name shown in header (e.g., 'Key', 'Summary', 'Status')
	"column_type" text NOT NULL DEFAULT 'text', -- text, select, user, date, labels, priority, etc.
	"width" integer DEFAULT 150, -- Column width in pixels
	"position" integer NOT NULL DEFAULT 0, -- Order of columns
	"is_visible" boolean NOT NULL DEFAULT true, -- Show/hide column
	"is_sortable" boolean NOT NULL DEFAULT true, -- Can column be sorted
	"is_filterable" boolean NOT NULL DEFAULT true, -- Can column be filtered
	"is_system" boolean NOT NULL DEFAULT false, -- System columns can't be deleted
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint
ALTER TABLE "list_view_columns" ADD CONSTRAINT "list_view_columns_workspace_id_workspaces_id_fk" 
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE cascade ON UPDATE no action;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "list_view_columns_workspace_idx" ON "list_view_columns" ("workspace_id");
CREATE INDEX IF NOT EXISTS "list_view_columns_position_idx" ON "list_view_columns" ("workspace_id", "position");

-- Insert default columns for existing workspaces
INSERT INTO "list_view_columns" ("workspace_id", "field_name", "display_name", "column_type", "width", "position", "is_visible", "is_sortable", "is_filterable", "is_system")
SELECT 
	w."id" as workspace_id,
	'issueId' as field_name,
	'Key' as display_name,
	'text' as column_type,
	100 as width,
	0 as position,
	true as is_visible,
	true as is_sortable,
	true as is_filterable,
	true as is_system
FROM "workspaces" w
WHERE NOT EXISTS (
	SELECT 1 FROM "list_view_columns" lvc WHERE lvc.workspace_id = w.id AND lvc.field_name = 'issueId'
);

INSERT INTO "list_view_columns" ("workspace_id", "field_name", "display_name", "column_type", "width", "position", "is_visible", "is_sortable", "is_filterable", "is_system")
SELECT 
	w."id" as workspace_id,
	'issueType' as field_name,
	'Type' as display_name,
	'select' as column_type,
	80 as width,
	1 as position,
	true as is_visible,
	true as is_sortable,
	true as is_filterable,
	true as is_system
FROM "workspaces" w
WHERE NOT EXISTS (
	SELECT 1 FROM "list_view_columns" lvc WHERE lvc.workspace_id = w.id AND lvc.field_name = 'issueType'
);

INSERT INTO "list_view_columns" ("workspace_id", "field_name", "display_name", "column_type", "width", "position", "is_visible", "is_sortable", "is_filterable", "is_system")
SELECT 
	w."id" as workspace_id,
	'summary' as field_name,
	'Summary' as display_name,
	'text' as column_type,
	300 as width,
	2 as position,
	true as is_visible,
	true as is_sortable,
	true as is_filterable,
	true as is_system
FROM "workspaces" w
WHERE NOT EXISTS (
	SELECT 1 FROM "list_view_columns" lvc WHERE lvc.workspace_id = w.id AND lvc.field_name = 'summary'
);

INSERT INTO "list_view_columns" ("workspace_id", "field_name", "display_name", "column_type", "width", "position", "is_visible", "is_sortable", "is_filterable", "is_system")
SELECT 
	w."id" as workspace_id,
	'status' as field_name,
	'Status' as display_name,
	'select' as column_type,
	120 as width,
	3 as position,
	true as is_visible,
	true as is_sortable,
	true as is_filterable,
	true as is_system
FROM "workspaces" w
WHERE NOT EXISTS (
	SELECT 1 FROM "list_view_columns" lvc WHERE lvc.workspace_id = w.id AND lvc.field_name = 'status'
);

INSERT INTO "list_view_columns" ("workspace_id", "field_name", "display_name", "column_type", "width", "position", "is_visible", "is_sortable", "is_filterable", "is_system")
SELECT 
	w."id" as workspace_id,
	'priority' as field_name,
	'Priority' as display_name,
	'priority' as column_type,
	100 as width,
	4 as position,
	true as is_visible,
	true as is_sortable,
	true as is_filterable,
	true as is_system
FROM "workspaces" w
WHERE NOT EXISTS (
	SELECT 1 FROM "list_view_columns" lvc WHERE lvc.workspace_id = w.id AND lvc.field_name = 'priority'
);

INSERT INTO "list_view_columns" ("workspace_id", "field_name", "display_name", "column_type", "width", "position", "is_visible", "is_sortable", "is_filterable", "is_system")
SELECT 
	w."id" as workspace_id,
	'assigneeId' as field_name,
	'Assignee' as display_name,
	'user' as column_type,
	120 as width,
	5 as position,
	true as is_visible,
	false as is_sortable,
	true as is_filterable,
	false as is_system
FROM "workspaces" w
WHERE NOT EXISTS (
	SELECT 1 FROM "list_view_columns" lvc WHERE lvc.workspace_id = w.id AND lvc.field_name = 'assigneeId'
);

INSERT INTO "list_view_columns" ("workspace_id", "field_name", "display_name", "column_type", "width", "position", "is_visible", "is_sortable", "is_filterable", "is_system")
SELECT 
	w."id" as workspace_id,
	'labels' as field_name,
	'Labels' as display_name,
	'labels' as column_type,
	150 as width,
	6 as position,
	true as is_visible,
	false as is_sortable,
	true as is_filterable,
	false as is_system
FROM "workspaces" w
WHERE NOT EXISTS (
	SELECT 1 FROM "list_view_columns" lvc WHERE lvc.workspace_id = w.id AND lvc.field_name = 'labels'
);

INSERT INTO "list_view_columns" ("workspace_id", "field_name", "display_name", "column_type", "width", "position", "is_visible", "is_sortable", "is_filterable", "is_system")
SELECT 
	w."id" as workspace_id,
	'dueDate' as field_name,
	'Due Date' as display_name,
	'date' as column_type,
	120 as width,
	7 as position,
	true as is_visible,
	true as is_sortable,
	true as is_filterable,
	false as is_system
FROM "workspaces" w
WHERE NOT EXISTS (
	SELECT 1 FROM "list_view_columns" lvc WHERE lvc.workspace_id = w.id AND lvc.field_name = 'dueDate'
);

INSERT INTO "list_view_columns" ("workspace_id", "field_name", "display_name", "column_type", "width", "position", "is_visible", "is_sortable", "is_filterable", "is_system")
SELECT 
	w."id" as workspace_id,
	'created' as field_name,
	'Created' as display_name,
	'date' as column_type,
	120 as width,
	8 as position,
	false as is_visible,
	true as is_sortable,
	true as is_filterable,
	false as is_system
FROM "workspaces" w
WHERE NOT EXISTS (
	SELECT 1 FROM "list_view_columns" lvc WHERE lvc.workspace_id = w.id AND lvc.field_name = 'created'
);

INSERT INTO "list_view_columns" ("workspace_id", "field_name", "display_name", "column_type", "width", "position", "is_visible", "is_sortable", "is_filterable", "is_system")
SELECT 
	w."id" as workspace_id,
	'updated' as field_name,
	'Updated' as display_name,
	'date' as column_type,
	120 as width,
	9 as position,
	false as is_visible,
	true as is_sortable,
	true as is_filterable,
	false as is_system
FROM "workspaces" w
WHERE NOT EXISTS (
	SELECT 1 FROM "list_view_columns" lvc WHERE lvc.workspace_id = w.id AND lvc.field_name = 'updated'
);

INSERT INTO "list_view_columns" ("workspace_id", "field_name", "display_name", "column_type", "width", "position", "is_visible", "is_sortable", "is_filterable", "is_system")
SELECT 
	w."id" as workspace_id,
	'reporterId' as field_name,
	'Reporter' as display_name,
	'user' as column_type,
	120 as width,
	10 as position,
	false as is_visible,
	false as is_sortable,
	true as is_filterable,
	false as is_system
FROM "workspaces" w
WHERE NOT EXISTS (
	SELECT 1 FROM "list_view_columns" lvc WHERE lvc.workspace_id = w.id AND lvc.field_name = 'reporterId'
);
