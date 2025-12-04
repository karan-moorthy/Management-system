import { pgTable, uuid, text, integer, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  password: text('password'),
  // Profile fields
  dateOfBirth: timestamp('date_of_birth'),
  native: text('native'), // Native place/hometown
  mobileNo: text('mobile_no').unique(), // Mobile number - unique
  designation: text('designation'), // Job designation
  department: text('department'), // Department
  experience: integer('experience'), // Years of experience
  dateOfJoining: timestamp('date_of_joining'), // Date of joining company
  skills: jsonb('skills').$type<string[]>().default([]), // Array of skills
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  nameIdx: index('name_idx').on(table.name),
  mobileIdx: index('mobile_idx').on(table.mobileNo),
}));

// Accounts table (OAuth)
export const accounts = pgTable('accounts', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
}, (table) => ({
  userIdx: index('accounts_user_idx').on(table.userId),
}));

// Sessions table
export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
}, (table) => ({
  userIdx: index('sessions_user_idx').on(table.userId),
}));

// Verification Tokens table
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires').notNull(),
});

// Workspaces table
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  imageUrl: text('image_url'),
  inviteCode: text('invite_code').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('workspaces_user_idx').on(table.userId),
  inviteCodeIdx: index('workspaces_invite_code_idx').on(table.inviteCode),
}));

// Members table
export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('MEMBER'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('members_user_idx').on(table.userId),
  workspaceIdx: index('members_workspace_idx').on(table.workspaceId),
  userWorkspaceIdx: index('members_user_workspace_idx').on(table.userId, table.workspaceId),
}));

// Projects table
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  imageUrl: text('image_url'),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }), // Made optional
  postDate: timestamp('post_date'), // Date project was posted
  tentativeEndDate: timestamp('tentative_end_date'), // Expected completion date
  assignees: jsonb('assignees').$type<string[]>().default([]), // Array of user IDs
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index('projects_workspace_idx').on(table.workspaceId),
}));

// Tasks table - Updated structure to match the new requirements
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  summary: text('summary').notNull(), // Main task title
  issueId: text('issue_id').notNull().unique(), // e.g., VECV-601
  issueType: text('issue_type').notNull().default('Task'), // Task, Bug, Epic, Story, etc.
  status: text('status').notNull().default('To Do'), // To Do, In Progress, Done, etc.
  projectName: text('project_name'), // e.g., VECV-SPINE - null for individual tasks
  priority: text('priority').default('Medium'), // High, Medium, Low
  resolution: text('resolution'), // Done, Won't Fix, Duplicate, etc.
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'set null' }),
  created: timestamp('created').defaultNow().notNull(),
  updated: timestamp('updated').defaultNow().notNull(),
  resolved: timestamp('resolved'),
  dueDate: timestamp('due_date'),
  labels: jsonb('labels'), // Array of labels as JSON
  description: text('description'),
  
  // Keep existing relationships
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Upload tracking for batch operations
  uploadBatchId: text('upload_batch_id'), // Track which CSV upload this task came from (human-readable format)
  uploadedAt: timestamp('uploaded_at'), // When this task was uploaded
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }), // Who uploaded this task
  
  // Additional useful fields
  estimatedHours: integer('estimated_hours'),
  actualHours: integer('actual_hours').default(0),
  position: integer('position').notNull().default(1000),
}, (table) => ({
  issueIdIdx: index('tasks_issue_id_idx').on(table.issueId),
  assigneeIdx: index('tasks_assignee_idx').on(table.assigneeId),
  reporterIdx: index('tasks_reporter_idx').on(table.reporterId),
  creatorIdx: index('tasks_creator_idx').on(table.creatorId),
  projectIdx: index('tasks_project_idx').on(table.projectId),
  workspaceIdx: index('tasks_workspace_idx').on(table.workspaceId),
  statusIdx: index('tasks_status_idx').on(table.status),
  priorityIdx: index('tasks_priority_idx').on(table.priority),
  projectNameIdx: index('tasks_project_name_idx').on(table.projectName),
  issueTypeIdx: index('tasks_issue_type_idx').on(table.issueType),
  dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
  uploadBatchIdx: index('tasks_upload_batch_idx').on(table.uploadBatchId), // Index for batch operations
  // Composite indexes for analytics performance
  workspaceCreatedIdx: index('tasks_workspace_created_idx').on(table.workspaceId, table.created),
  workspaceStatusCreatedIdx: index('tasks_workspace_status_created_idx').on(table.workspaceId, table.status, table.created),
  workspaceAssigneeCreatedIdx: index('tasks_workspace_assignee_created_idx').on(table.workspaceId, table.assigneeId, table.created),
  workspaceDueDateCreatedIdx: index('tasks_workspace_duedate_created_idx').on(table.workspaceId, table.dueDate, table.created),
}));



// Invitations table
export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  invitedBy: uuid('invited_by').notNull().references(() => users.id),
  status: text('status').notNull().default('PENDING'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('invitations_email_idx').on(table.email),
  workspaceIdx: index('invitations_workspace_idx').on(table.workspaceId),
  statusIdx: index('invitations_status_idx').on(table.status),
}));

// Attendance table
export const attendance = pgTable('attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }), // Nullable - workspace concept removed
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  shiftStartTime: timestamp('shift_start_time').notNull(),
  shiftEndTime: timestamp('shift_end_time'),
  totalDuration: integer('total_duration'), // in minutes
  endActivity: text('end_activity'), // What was accomplished at end
  dailyTasks: jsonb('daily_tasks'), // array of task strings
  status: text('status').notNull().default('IN_PROGRESS'), // IN_PROGRESS, COMPLETED, AUTO_COMPLETED
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('attendance_user_idx').on(table.userId),
  workspaceIdx: index('attendance_workspace_idx').on(table.workspaceId),
  projectIdx: index('attendance_project_idx').on(table.projectId),
  dateIdx: index('attendance_date_idx').on(table.shiftStartTime),
  statusIdx: index('attendance_status_idx').on(table.status),
  userDateIdx: index('attendance_user_date_idx').on(table.userId, table.shiftStartTime),
}));

// Custom designations table - for user-added designations
export const customDesignations = pgTable('custom_designations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  nameIdx: index('custom_designations_name_idx').on(table.name),
}));

// Custom departments table - for user-added departments
export const customDepartments = pgTable('custom_departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  nameIdx: index('custom_departments_name_idx').on(table.name),
}));

// Project requirements table
export const projectRequirements = pgTable('project_requirements', {
  id: uuid('id').primaryKey().defaultRandom(),
  tentativeTitle: text('tentative_title').notNull(),
  customer: text('customer').notNull(),
  projectManagerId: uuid('project_manager_id').references(() => users.id),
  projectDescription: text('project_description'),
  dueDate: timestamp('due_date'), // Due date for requirement
  sampleInputFiles: jsonb('sample_input_files').$type<string[]>().default([]), // Array of file URLs/paths
  expectedOutputFiles: jsonb('expected_output_files').$type<string[]>().default([]), // Array of file URLs/paths
  status: text('status').notNull().default('PENDING'), // PENDING, APPROVED, REJECTED
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectManagerIdx: index('requirements_project_manager_idx').on(table.projectManagerId),
  statusIdx: index('requirements_status_idx').on(table.status),
  dueDateIdx: index('requirements_due_date_idx').on(table.dueDate),
}));

// Activity Logs table - Jira-style comprehensive activity tracking
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Core fields
  actionType: text('action_type').notNull(), // TASK_CREATED, TASK_UPDATED, STATUS_CHANGED, ASSIGNED, etc.
  entityType: text('entity_type').notNull(), // TASK, PROJECT, USER, WORKSPACE
  entityId: uuid('entity_id').notNull(), // ID of the affected entity
  
  // User who performed the action
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userName: text('user_name').notNull(), // Denormalized for faster queries
  
  // Context
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  
  // Change details (JSON for flexibility)
  changes: jsonb('changes').$type<{
    field?: string; // Which field changed (status, assignee, priority, etc.)
    oldValue?: string | null;
    newValue?: string | null;
    description?: string; // Human-readable description
    metadata?: Record<string, any>; // Additional data
  }>(),
  
  // Summary for quick display
  summary: text('summary').notNull(), // "Karan changed status from To Do to In Progress"
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for fast queries
  entityIdx: index('activity_logs_entity_idx').on(table.entityType, table.entityId),
  userIdx: index('activity_logs_user_idx').on(table.userId),
  workspaceIdx: index('activity_logs_workspace_idx').on(table.workspaceId),
  taskIdx: index('activity_logs_task_idx').on(table.taskId),
  projectIdx: index('activity_logs_project_idx').on(table.projectId),
  createdAtIdx: index('activity_logs_created_at_idx').on(table.createdAt),
  actionTypeIdx: index('activity_logs_action_type_idx').on(table.actionType),
  // Composite index for common queries
  workspaceCreatedIdx: index('activity_logs_workspace_created_idx').on(table.workspaceId, table.createdAt),
}));

// Task Overviews table - For task completion validation workflow
export const taskOverviews = pgTable('task_overviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Required completion details
  completedWorkDescription: text('completed_work_description').notNull(), // What was completed
  completionMethod: text('completion_method').notNull(), // How it was completed
  stepsFollowed: text('steps_followed').notNull(), // Steps/methods used
  
  // Proof of work (screenshots, files, links, commits)
  proofOfWork: jsonb('proof_of_work').$type<{
    screenshots?: string[]; // Array of image URLs
    files?: string[]; // Array of file URLs
    links?: string[]; // Array of relevant links
    githubCommits?: string[]; // Array of commit URLs/hashes
  }>().notNull(),
  
  // Optional fields
  challenges: text('challenges'), // Challenges faced
  additionalRemarks: text('additional_remarks'), // Extra notes
  timeSpent: integer('time_spent'), // Time in minutes (optional)
  
  // System fields
  taskTitle: text('task_title').notNull(), // Auto-filled from task
  employeeName: text('employee_name').notNull(), // Auto-filled from user
  resolvedDate: timestamp('resolved_date'), // When task was completed
  resolvedTime: text('resolved_time'), // Time portion stored separately
  
  // Review status
  status: text('status').notNull().default('PENDING'), // PENDING, APPROVED, REWORK
  adminRemarks: text('admin_remarks'), // Admin feedback/comments
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  taskIdx: index('task_overviews_task_idx').on(table.taskId),
  employeeIdx: index('task_overviews_employee_idx').on(table.employeeId),
  statusIdx: index('task_overviews_status_idx').on(table.status),
  reviewerIdx: index('task_overviews_reviewer_idx').on(table.reviewedBy),
  // Unique constraint: one overview per task
  uniqueTaskOverview: uniqueIndex('task_overviews_task_unique_idx').on(table.taskId),
}));

// Notifications table - For employee-specific task updates
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // Who receives the notification
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  
  // Notification content
  type: text('type').notNull(), // TASK_REWORK, ADMIN_REMARK, TASK_APPROVED, TASK_ASSIGNED, etc.
  title: text('title').notNull(),
  message: text('message').notNull(),
  
  // Related data
  actionBy: uuid('action_by').references(() => users.id, { onDelete: 'set null' }), // Who triggered this notification
  actionByName: text('action_by_name'), // Denormalized for quick display
  
  // Status
  isRead: text('is_read').notNull().default('false'), // 'true' or 'false' as text
  readAt: timestamp('read_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
  taskIdx: index('notifications_task_idx').on(table.taskId),
  typeIdx: index('notifications_type_idx').on(table.type),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
  // Composite index for user's unread notifications
  userUnreadIdx: index('notifications_user_unread_idx').on(table.userId, table.isRead, table.createdAt),
}));

// Weekly Reports table - Employee weekly report submissions
export const weeklyReports = pgTable('weekly_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Date range
  fromDate: timestamp('from_date').notNull(),
  toDate: timestamp('to_date').notNull(),
  
  // Employee details
  department: text('department').notNull(), // Auto-filled from user profile
  
  // Report content - JSON structure: { "2025-11-25": "description", "2025-11-26": "description" }
  dailyDescriptions: jsonb('daily_descriptions').$type<Record<string, string>>().notNull().default({}),
  
  // File uploads - JSON array: [{ date: "2025-11-25", fileName: "file.pdf", fileUrl: "/uploads/...", fileSize: 12345 }]
  uploadedFiles: jsonb('uploaded_files').$type<Array<{
    date: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: string;
  }>>().notNull().default([]),
  
  // Status tracking
  status: text('status').notNull().default('submitted'), // submitted, reviewed, archived
  isDraft: text('is_draft').notNull().default('false'), // 'true' for drafts, 'false' for submitted reports
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('weekly_reports_user_idx').on(table.userId),
  departmentIdx: index('weekly_reports_department_idx').on(table.department),
  fromDateIdx: index('weekly_reports_from_date_idx').on(table.fromDate),
  toDateIdx: index('weekly_reports_to_date_idx').on(table.toDate),
  createdAtIdx: index('weekly_reports_created_at_idx').on(table.createdAt),
  isDraftIdx: index('weekly_reports_is_draft_idx').on(table.isDraft),
}));

// Custom Bug Types table - For user-added bug types
export const customBugTypes = pgTable('custom_bug_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  nameIdx: index('custom_bug_types_name_idx').on(table.name),
}));

// Bug Tracker table - For bug tracking system
export const bugs = pgTable('bugs', {
  id: uuid('id').primaryKey().defaultRandom(),
  bugId: text('bug_id').notNull().unique(), // Auto-generated: BUG-001, BUG-002, etc.
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }), // Bug fixer
  bugType: text('bug_type').notNull().default('Development'), // UI/UX, Development, Testing, or custom
  bugDescription: text('bug_description').notNull(),
  fileUrl: text('file_url'), // Optional file attachment
  
  // Status tracking
  status: text('status').notNull().default('Open'), // Open, In Progress, Resolved, Closed
  priority: text('priority').default('Medium'), // Low, Medium, High, Critical
  
  // Reporter details
  reportedBy: uuid('reported_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reportedByName: text('reported_by_name').notNull(), // Denormalized for quick display
  
  // Workspace context
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Resolution tracking
  resolvedAt: timestamp('resolved_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  bugIdIdx: index('bugs_bug_id_idx').on(table.bugId),
  assignedToIdx: index('bugs_assigned_to_idx').on(table.assignedTo),
  bugTypeIdx: index('bugs_bug_type_idx').on(table.bugType),
  statusIdx: index('bugs_status_idx').on(table.status),
  reportedByIdx: index('bugs_reported_by_idx').on(table.reportedBy),
  workspaceIdx: index('bugs_workspace_idx').on(table.workspaceId),
  createdAtIdx: index('bugs_created_at_idx').on(table.createdAt),
}));
