-- ============================================================================
-- GGS Management System - Complete Database Schema
-- Generated: 2026-01-07
-- Total Tables: 31
-- PostgreSQL Version: 16+
-- ============================================================================

-- Drop existing tables (in reverse dependency order)
DROP TABLE IF EXISTS sprint_tasks CASCADE;
DROP TABLE IF EXISTS sprints CASCADE;
DROP TABLE IF EXISTS board_configs CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS issue_type_configs CASCADE;
DROP TABLE IF EXISTS custom_field_values CASCADE;
DROP TABLE IF EXISTS custom_field_definitions CASCADE;
DROP TABLE IF EXISTS list_view_columns CASCADE;
DROP TABLE IF EXISTS board_columns CASCADE;
DROP TABLE IF EXISTS client_invitations CASCADE;
DROP TABLE IF EXISTS bug_comments CASCADE;
DROP TABLE IF EXISTS bugs CASCADE;
DROP TABLE IF EXISTS custom_bug_types CASCADE;
DROP TABLE IF EXISTS weekly_reports CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS task_overviews CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS project_requirements CASCADE;
DROP TABLE IF EXISTS custom_departments CASCADE;
DROP TABLE IF EXISTS custom_designations CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  email_verified TIMESTAMP,
  image TEXT,
  password TEXT,
  date_of_birth TIMESTAMP,
  native TEXT,
  mobile_no TEXT UNIQUE,
  designation TEXT,
  department TEXT,
  experience INTEGER,
  date_of_joining TIMESTAMP,
  skills JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX email_idx ON users(email);
CREATE INDEX name_idx ON users(name);
CREATE INDEX mobile_idx ON users(mobile_no);

-- Accounts table (OAuth)
CREATE TABLE accounts (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT
);

CREATE INDEX accounts_user_idx ON accounts(user_id);

-- User Sessions table (renamed from sessions to avoid Supabase conflict)
CREATE TABLE user_sessions (
  session_token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);

CREATE INDEX sessions_user_idx ON user_sessions(user_id);

-- Verification Tokens table
CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP NOT NULL
);

-- Workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  invite_code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX workspaces_user_idx ON workspaces(user_id);
CREATE INDEX workspaces_invite_code_idx ON workspaces(invite_code);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  post_date TIMESTAMP,
  tentative_end_date TIMESTAMP,
  assignees JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX projects_workspace_idx ON projects(workspace_id);

-- Members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX members_user_idx ON members(user_id);
CREATE INDEX members_workspace_idx ON members(workspace_id);
CREATE INDEX members_project_idx ON members(project_id);
CREATE INDEX members_user_workspace_idx ON members(user_id, workspace_id);

-- ============================================================================
-- TASK MANAGEMENT
-- ============================================================================

-- Tasks table (Jira-like)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary TEXT NOT NULL,
  issue_id TEXT NOT NULL UNIQUE,
  issue_type TEXT NOT NULL DEFAULT 'Task',
  status TEXT NOT NULL DEFAULT 'To Do',
  project_name TEXT,
  priority TEXT DEFAULT 'Medium',
  resolution TEXT,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created TIMESTAMP NOT NULL DEFAULT NOW(),
  updated TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved TIMESTAMP,
  due_date TIMESTAMP,
  labels JSONB,
  description TEXT,
  custom_fields JSONB,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  upload_batch_id TEXT,
  uploaded_at TIMESTAMP,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  estimated_hours INTEGER,
  actual_hours INTEGER DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 1000
);

CREATE INDEX tasks_issue_id_idx ON tasks(issue_id);
CREATE INDEX tasks_assignee_idx ON tasks(assignee_id);
CREATE INDEX tasks_reporter_idx ON tasks(reporter_id);
CREATE INDEX tasks_creator_idx ON tasks(creator_id);
CREATE INDEX tasks_parent_task_idx ON tasks(parent_task_id);
CREATE INDEX tasks_project_idx ON tasks(project_id);
CREATE INDEX tasks_workspace_idx ON tasks(workspace_id);
CREATE INDEX tasks_status_idx ON tasks(status);
CREATE INDEX tasks_priority_idx ON tasks(priority);
CREATE INDEX tasks_project_name_idx ON tasks(project_name);
CREATE INDEX tasks_issue_type_idx ON tasks(issue_type);
CREATE INDEX tasks_due_date_idx ON tasks(due_date);
CREATE INDEX tasks_upload_batch_idx ON tasks(upload_batch_id);
CREATE INDEX tasks_workspace_created_idx ON tasks(workspace_id, created);
CREATE INDEX tasks_workspace_status_created_idx ON tasks(workspace_id, status, created);
CREATE INDEX tasks_workspace_assignee_created_idx ON tasks(workspace_id, assignee_id, created);
CREATE INDEX tasks_workspace_duedate_created_idx ON tasks(workspace_id, due_date, created);

-- Task Overviews table
CREATE TABLE task_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE UNIQUE,
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_work_description TEXT NOT NULL,
  completion_method TEXT NOT NULL,
  steps_followed TEXT NOT NULL,
  proof_of_work JSONB NOT NULL,
  challenges TEXT,
  additional_remarks TEXT,
  time_spent INTEGER,
  task_title TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  resolved_date TIMESTAMP,
  resolved_time TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  admin_remarks TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX task_overviews_task_idx ON task_overviews(task_id);
CREATE INDEX task_overviews_employee_idx ON task_overviews(employee_id);
CREATE INDEX task_overviews_status_idx ON task_overviews(status);
CREATE INDEX task_overviews_reviewer_idx ON task_overviews(reviewed_by);
CREATE UNIQUE INDEX task_overviews_task_unique_idx ON task_overviews(task_id);

-- Activity Logs table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  changes JSONB,
  summary TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX activity_logs_entity_idx ON activity_logs(entity_type, entity_id);
CREATE INDEX activity_logs_user_idx ON activity_logs(user_id);
CREATE INDEX activity_logs_workspace_idx ON activity_logs(workspace_id);
CREATE INDEX activity_logs_task_idx ON activity_logs(task_id);
CREATE INDEX activity_logs_project_idx ON activity_logs(project_id);
CREATE INDEX activity_logs_created_at_idx ON activity_logs(created_at);
CREATE INDEX activity_logs_action_type_idx ON activity_logs(action_type);
CREATE INDEX activity_logs_workspace_created_idx ON activity_logs(workspace_id, created_at);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_by UUID REFERENCES users(id) ON DELETE SET NULL,
  action_by_name TEXT,
  is_read TEXT NOT NULL DEFAULT 'false',
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_idx ON notifications(user_id);
CREATE INDEX notifications_task_idx ON notifications(task_id);
CREATE INDEX notifications_type_idx ON notifications(type);
CREATE INDEX notifications_is_read_idx ON notifications(is_read);
CREATE INDEX notifications_user_unread_idx ON notifications(user_id, is_read, created_at);

-- Project Requirements table
CREATE TABLE project_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tentative_title TEXT NOT NULL,
  customer TEXT NOT NULL,
  project_manager_id UUID REFERENCES users(id),
  project_description TEXT,
  due_date TIMESTAMP,
  sample_input_files JSONB DEFAULT '[]'::JSONB,
  expected_output_files JSONB DEFAULT '[]'::JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX requirements_project_manager_idx ON project_requirements(project_manager_id);
CREATE INDEX requirements_status_idx ON project_requirements(status);
CREATE INDEX requirements_due_date_idx ON project_requirements(due_date);

-- Invitations table
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX invitations_email_idx ON invitations(email);
CREATE INDEX invitations_workspace_idx ON invitations(workspace_id);
CREATE INDEX invitations_status_idx ON invitations(status);

-- Client Invitations table
CREATE TABLE client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX client_invitations_email_idx ON client_invitations(email);
CREATE INDEX client_invitations_project_idx ON client_invitations(project_id);
CREATE INDEX client_invitations_token_idx ON client_invitations(token);
CREATE INDEX client_invitations_status_idx ON client_invitations(status);

-- ============================================================================
-- ATTENDANCE & REPORTS
-- ============================================================================

-- Attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  shift_start_time TIMESTAMP NOT NULL,
  shift_end_time TIMESTAMP,
  total_duration INTEGER,
  end_activity TEXT,
  daily_tasks JSONB,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX attendance_user_idx ON attendance(user_id);
CREATE INDEX attendance_workspace_idx ON attendance(workspace_id);
CREATE INDEX attendance_project_idx ON attendance(project_id);
CREATE INDEX attendance_date_idx ON attendance(shift_start_time);
CREATE INDEX attendance_status_idx ON attendance(status);
CREATE INDEX attendance_user_date_idx ON attendance(user_id, shift_start_time);

-- Weekly Reports table
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_date TIMESTAMP NOT NULL,
  to_date TIMESTAMP NOT NULL,
  department TEXT NOT NULL,
  daily_descriptions JSONB NOT NULL DEFAULT '{}'::JSONB,
  uploaded_files JSONB NOT NULL DEFAULT '[]'::JSONB,
  status TEXT NOT NULL DEFAULT 'submitted',
  is_draft TEXT NOT NULL DEFAULT 'false',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX weekly_reports_user_idx ON weekly_reports(user_id);
CREATE INDEX weekly_reports_department_idx ON weekly_reports(department);
CREATE INDEX weekly_reports_from_date_idx ON weekly_reports(from_date);
CREATE INDEX weekly_reports_to_date_idx ON weekly_reports(to_date);
CREATE INDEX weekly_reports_created_at_idx ON weekly_reports(created_at);
CREATE INDEX weekly_reports_is_draft_idx ON weekly_reports(is_draft);

-- ============================================================================
-- BUG TRACKING
-- ============================================================================

-- Custom Bug Types table
CREATE TABLE custom_bug_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX custom_bug_types_name_idx ON custom_bug_types(name);

-- Bugs table
CREATE TABLE bugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id TEXT NOT NULL UNIQUE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  bug_type TEXT NOT NULL DEFAULT 'Development',
  bug_description TEXT NOT NULL,
  file_url TEXT,
  output_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'Open',
  priority TEXT DEFAULT 'Medium',
  reported_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_by_name TEXT NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX bugs_bug_id_idx ON bugs(bug_id);
CREATE INDEX bugs_assigned_to_idx ON bugs(assigned_to);
CREATE INDEX bugs_bug_type_idx ON bugs(bug_type);
CREATE INDEX bugs_status_idx ON bugs(status);
CREATE INDEX bugs_reported_by_idx ON bugs(reported_by);
CREATE INDEX bugs_workspace_idx ON bugs(workspace_id);
CREATE INDEX bugs_created_at_idx ON bugs(created_at);

-- Bug Comments table
CREATE TABLE bug_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_id UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  file_url TEXT,
  is_system_comment BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX bug_comments_bug_id_idx ON bug_comments(bug_id);
CREATE INDEX bug_comments_user_id_idx ON bug_comments(user_id);
CREATE INDEX bug_comments_created_at_idx ON bug_comments(created_at);

-- ============================================================================
-- CUSTOM CONFIGURATION
-- ============================================================================

-- Custom Designations table
CREATE TABLE custom_designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX custom_designations_name_idx ON custom_designations(name);

-- Custom Departments table
CREATE TABLE custom_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX custom_departments_name_idx ON custom_departments(name);

-- Board Columns table
CREATE TABLE board_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#808080',
  category TEXT NOT NULL DEFAULT 'TODO',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX board_columns_workspace_idx ON board_columns(workspace_id);
CREATE INDEX board_columns_position_idx ON board_columns(position);

-- List View Columns table
CREATE TABLE list_view_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  column_type TEXT NOT NULL DEFAULT 'text',
  width INTEGER DEFAULT 150,
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  is_sortable BOOLEAN NOT NULL DEFAULT TRUE,
  is_filterable BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX list_view_columns_workspace_idx ON list_view_columns(workspace_id);
CREATE INDEX list_view_columns_project_idx ON list_view_columns(project_id);
CREATE INDEX list_view_columns_project_position_idx ON list_view_columns(project_id, position);

-- ============================================================================
-- JIRA-LIKE DYNAMIC FIELD SYSTEM
-- ============================================================================

-- Custom Field Definitions table
CREATE TABLE custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL,
  field_description TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  field_options JSONB,
  validation_rules JSONB,
  applies_to_issue_types JSONB,
  applies_to_projects JSONB,
  display_order INTEGER DEFAULT 1000,
  is_visible_in_list BOOLEAN DEFAULT FALSE,
  is_visible_in_detail BOOLEAN DEFAULT TRUE,
  is_searchable BOOLEAN DEFAULT TRUE,
  is_filterable BOOLEAN DEFAULT TRUE,
  is_system_field BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX custom_field_definitions_workspace_idx ON custom_field_definitions(workspace_id);
CREATE INDEX custom_field_definitions_field_key_idx ON custom_field_definitions(field_key);
CREATE UNIQUE INDEX custom_field_unique_key_per_workspace ON custom_field_definitions(workspace_id, field_key);

-- Custom Field Values table
CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  field_definition_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  value TEXT,
  value_number INTEGER,
  value_date TIMESTAMP,
  value_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  value_json JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX custom_field_values_task_idx ON custom_field_values(task_id);
CREATE INDEX custom_field_values_field_definition_idx ON custom_field_values(field_definition_id);
CREATE UNIQUE INDEX custom_field_value_unique_per_task ON custom_field_values(task_id, field_definition_id);

-- Issue Type Configs table
CREATE TABLE issue_type_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  issue_type_name TEXT NOT NULL,
  issue_type_key TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_subtask_type BOOLEAN DEFAULT FALSE,
  workflow_id UUID,
  display_order INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX issue_type_configs_workspace_idx ON issue_type_configs(workspace_id);
CREATE UNIQUE INDEX issue_type_unique_key_per_workspace ON issue_type_configs(workspace_id, issue_type_key);

-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  statuses JSONB NOT NULL,
  transitions JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX workflows_workspace_idx ON workflows(workspace_id);

-- Board Configs table
CREATE TABLE board_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  board_type TEXT NOT NULL DEFAULT 'KANBAN',
  description TEXT,
  columns JSONB NOT NULL,
  filter_config JSONB,
  card_color_by TEXT DEFAULT 'PRIORITY',
  swimlanes_by TEXT,
  sprint_duration_weeks INTEGER,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX board_configs_workspace_idx ON board_configs(workspace_id);
CREATE INDEX board_configs_project_idx ON board_configs(project_id);

-- Sprints table
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES board_configs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  state TEXT NOT NULL DEFAULT 'FUTURE',
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX sprints_workspace_idx ON sprints(workspace_id);
CREATE INDEX sprints_board_idx ON sprints(board_id);
CREATE INDEX sprints_state_idx ON sprints(state);

-- Sprint Tasks table
CREATE TABLE sprint_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMP
);

CREATE INDEX sprint_tasks_sprint_idx ON sprint_tasks(sprint_id);
CREATE INDEX sprint_tasks_task_idx ON sprint_tasks(task_id);
CREATE UNIQUE INDEX sprint_task_unique ON sprint_tasks(sprint_id, task_id);

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Total Tables: 31
-- Core: 6 (users, accounts, user_sessions, verification_tokens, workspaces, members)
-- Projects: 8 (projects, tasks, task_overviews, activity_logs, notifications, requirements, invitations, client_invitations)
-- Attendance: 2 (attendance, weekly_reports)
-- Bugs: 3 (bugs, bug_comments, custom_bug_types)
-- Config: 4 (custom_designations, custom_departments, board_columns, list_view_columns)
-- Jira System: 7 (custom_field_definitions, custom_field_values, issue_type_configs, workflows, board_configs, sprints, sprint_tasks)
-- Custom: 1 (custom_bug_types)

-- Generated by: GGS Management System
-- Schema Version: 1.0.0
-- Date: 2026-01-07
