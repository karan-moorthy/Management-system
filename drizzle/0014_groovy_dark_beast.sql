CREATE TABLE "activity_logs" (
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
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"color" text DEFAULT '#808080',
	"category" text DEFAULT 'TODO' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"name" text NOT NULL,
	"board_type" text DEFAULT 'KANBAN' NOT NULL,
	"description" text,
	"columns" jsonb NOT NULL,
	"filter_config" jsonb,
	"card_color_by" text DEFAULT 'PRIORITY',
	"swimlanes_by" text,
	"sprint_duration_weeks" integer,
	"is_favorite" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bug_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bug_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"user_name" text NOT NULL,
	"comment" text NOT NULL,
	"file_url" text,
	"is_system_comment" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bugs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bug_id" text NOT NULL,
	"assigned_to" uuid,
	"bug_type" text DEFAULT 'Development' NOT NULL,
	"bug_description" text NOT NULL,
	"file_url" text,
	"output_file_url" text,
	"status" text DEFAULT 'Open' NOT NULL,
	"priority" text DEFAULT 'Medium',
	"reported_by" uuid NOT NULL,
	"reported_by_name" text NOT NULL,
	"workspace_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bugs_bug_id_unique" UNIQUE("bug_id")
);
--> statement-breakpoint
CREATE TABLE "client_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "custom_bug_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "custom_bug_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "custom_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "custom_departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "custom_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"field_key" text NOT NULL,
	"field_type" text NOT NULL,
	"field_description" text,
	"is_required" boolean DEFAULT false,
	"default_value" text,
	"field_options" jsonb,
	"validation_rules" jsonb,
	"applies_to_issue_types" jsonb,
	"applies_to_projects" jsonb,
	"display_order" integer DEFAULT 1000,
	"is_visible_in_list" boolean DEFAULT false,
	"is_visible_in_detail" boolean DEFAULT true,
	"is_searchable" boolean DEFAULT true,
	"is_filterable" boolean DEFAULT true,
	"is_system_field" boolean DEFAULT false,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"field_definition_id" uuid NOT NULL,
	"value" text,
	"value_number" integer,
	"value_date" timestamp,
	"value_user_id" uuid,
	"value_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_type_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"issue_type_name" text NOT NULL,
	"issue_type_key" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"is_subtask_type" boolean DEFAULT false,
	"workflow_id" uuid,
	"display_order" integer DEFAULT 1000,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "list_view_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"project_id" uuid,
	"field_name" text NOT NULL,
	"display_name" text NOT NULL,
	"column_type" text DEFAULT 'text' NOT NULL,
	"width" integer DEFAULT 150,
	"position" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"is_sortable" boolean DEFAULT true NOT NULL,
	"is_filterable" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"action_by" uuid,
	"action_by_name" text,
	"is_read" text DEFAULT 'false' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprint_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sprint_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"removed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"board_id" uuid NOT NULL,
	"name" text NOT NULL,
	"goal" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"state" text DEFAULT 'FUTURE' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_overviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"completed_work_description" text NOT NULL,
	"completion_method" text NOT NULL,
	"steps_followed" text NOT NULL,
	"proof_of_work" jsonb NOT NULL,
	"challenges" text,
	"additional_remarks" text,
	"time_spent" integer,
	"task_title" text NOT NULL,
	"employee_name" text NOT NULL,
	"resolved_date" timestamp,
	"resolved_time" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"admin_remarks" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weekly_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_date" timestamp NOT NULL,
	"to_date" timestamp NOT NULL,
	"department" text NOT NULL,
	"daily_descriptions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"uploaded_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"is_draft" text DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"statuses" jsonb NOT NULL,
	"transitions" jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "project_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "project_requirements" ADD COLUMN "due_date" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "parent_task_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "custom_fields" jsonb;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_columns" ADD CONSTRAINT "board_columns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_configs" ADD CONSTRAINT "board_configs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_configs" ADD CONSTRAINT "board_configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_configs" ADD CONSTRAINT "board_configs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_comments" ADD CONSTRAINT "bug_comments_bug_id_bugs_id_fk" FOREIGN KEY ("bug_id") REFERENCES "public"."bugs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_comments" ADD CONSTRAINT "bug_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bugs" ADD CONSTRAINT "bugs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_invitations" ADD CONSTRAINT "client_invitations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_invitations" ADD CONSTRAINT "client_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_invitations" ADD CONSTRAINT "client_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_definition_id_custom_field_definitions_id_fk" FOREIGN KEY ("field_definition_id") REFERENCES "public"."custom_field_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_value_user_id_users_id_fk" FOREIGN KEY ("value_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issue_type_configs" ADD CONSTRAINT "issue_type_configs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_view_columns" ADD CONSTRAINT "list_view_columns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_view_columns" ADD CONSTRAINT "list_view_columns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_action_by_users_id_fk" FOREIGN KEY ("action_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_tasks" ADD CONSTRAINT "sprint_tasks_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_tasks" ADD CONSTRAINT "sprint_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_board_id_board_configs_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."board_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_overviews" ADD CONSTRAINT "task_overviews_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_overviews" ADD CONSTRAINT "task_overviews_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_overviews" ADD CONSTRAINT "task_overviews_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activity_logs_user_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_workspace_idx" ON "activity_logs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "activity_logs_task_idx" ON "activity_logs" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "activity_logs_project_idx" ON "activity_logs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_action_type_idx" ON "activity_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "activity_logs_workspace_created_idx" ON "activity_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "board_columns_workspace_idx" ON "board_columns" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "board_columns_position_idx" ON "board_columns" USING btree ("position");--> statement-breakpoint
CREATE INDEX "board_configs_workspace_idx" ON "board_configs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "board_configs_project_idx" ON "board_configs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "bug_comments_bug_id_idx" ON "bug_comments" USING btree ("bug_id");--> statement-breakpoint
CREATE INDEX "bug_comments_user_id_idx" ON "bug_comments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bug_comments_created_at_idx" ON "bug_comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bugs_bug_id_idx" ON "bugs" USING btree ("bug_id");--> statement-breakpoint
CREATE INDEX "bugs_assigned_to_idx" ON "bugs" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "bugs_bug_type_idx" ON "bugs" USING btree ("bug_type");--> statement-breakpoint
CREATE INDEX "bugs_status_idx" ON "bugs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bugs_reported_by_idx" ON "bugs" USING btree ("reported_by");--> statement-breakpoint
CREATE INDEX "bugs_workspace_idx" ON "bugs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "bugs_created_at_idx" ON "bugs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "client_invitations_email_idx" ON "client_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "client_invitations_project_idx" ON "client_invitations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "client_invitations_token_idx" ON "client_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "client_invitations_status_idx" ON "client_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "custom_bug_types_name_idx" ON "custom_bug_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX "custom_departments_name_idx" ON "custom_departments" USING btree ("name");--> statement-breakpoint
CREATE INDEX "custom_field_definitions_workspace_idx" ON "custom_field_definitions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "custom_field_definitions_field_key_idx" ON "custom_field_definitions" USING btree ("field_key");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_field_unique_key_per_workspace" ON "custom_field_definitions" USING btree ("workspace_id","field_key");--> statement-breakpoint
CREATE INDEX "custom_field_values_task_idx" ON "custom_field_values" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "custom_field_values_field_definition_idx" ON "custom_field_values" USING btree ("field_definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_field_value_unique_per_task" ON "custom_field_values" USING btree ("task_id","field_definition_id");--> statement-breakpoint
CREATE INDEX "issue_type_configs_workspace_idx" ON "issue_type_configs" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "issue_type_unique_key_per_workspace" ON "issue_type_configs" USING btree ("workspace_id","issue_type_key");--> statement-breakpoint
CREATE INDEX "list_view_columns_workspace_idx" ON "list_view_columns" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "list_view_columns_project_idx" ON "list_view_columns" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "list_view_columns_project_position_idx" ON "list_view_columns" USING btree ("project_id","position");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_task_idx" ON "notifications" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "sprint_tasks_sprint_idx" ON "sprint_tasks" USING btree ("sprint_id");--> statement-breakpoint
CREATE INDEX "sprint_tasks_task_idx" ON "sprint_tasks" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sprint_task_unique" ON "sprint_tasks" USING btree ("sprint_id","task_id");--> statement-breakpoint
CREATE INDEX "sprints_workspace_idx" ON "sprints" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sprints_board_idx" ON "sprints" USING btree ("board_id");--> statement-breakpoint
CREATE INDEX "sprints_state_idx" ON "sprints" USING btree ("state");--> statement-breakpoint
CREATE INDEX "task_overviews_task_idx" ON "task_overviews" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_overviews_employee_idx" ON "task_overviews" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "task_overviews_status_idx" ON "task_overviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_overviews_reviewer_idx" ON "task_overviews" USING btree ("reviewed_by");--> statement-breakpoint
CREATE UNIQUE INDEX "task_overviews_task_unique_idx" ON "task_overviews" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "weekly_reports_user_idx" ON "weekly_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "weekly_reports_department_idx" ON "weekly_reports" USING btree ("department");--> statement-breakpoint
CREATE INDEX "weekly_reports_from_date_idx" ON "weekly_reports" USING btree ("from_date");--> statement-breakpoint
CREATE INDEX "weekly_reports_to_date_idx" ON "weekly_reports" USING btree ("to_date");--> statement-breakpoint
CREATE INDEX "weekly_reports_created_at_idx" ON "weekly_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "weekly_reports_is_draft_idx" ON "weekly_reports" USING btree ("is_draft");--> statement-breakpoint
CREATE INDEX "workflows_workspace_idx" ON "workflows" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "members_project_idx" ON "members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "requirements_due_date_idx" ON "project_requirements" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "tasks_parent_task_idx" ON "tasks" USING btree ("parent_task_id");