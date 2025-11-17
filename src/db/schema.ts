import { pgTable, uuid, text, integer, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  password: text('password'),
  // Profile fields
  dateOfBirth: timestamp('date_of_birth'),
  native: text('native'), // Native place/hometown
  mobileNo: text('mobile_no'), // Mobile number
  designation: text('designation'), // Job designation
  department: text('department'), // Department
  experience: integer('experience'), // Years of experience
  dateOfJoining: timestamp('date_of_joining'), // Date of joining company
  skills: jsonb('skills').$type<string[]>().default([]), // Array of skills
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
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
  projectName: text('project_name').notNull(), // e.g., VECV-SPINE
  priority: text('priority').default('Medium'), // High, Medium, Low
  resolution: text('resolution'), // Done, Won't Fix, Duplicate, etc.
  assigneeId: uuid('assignee_id').references(() => users.id),
  reporterId: uuid('reporter_id').references(() => users.id),
  creatorId: uuid('creator_id').references(() => users.id),
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
  uploadedBy: uuid('uploaded_by').references(() => users.id), // Who uploaded this task
  
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
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  shiftStartTime: timestamp('shift_start_time').notNull(),
  shiftEndTime: timestamp('shift_end_time'),
  totalDuration: integer('total_duration'), // in minutes
  endActivity: text('end_activity'), // What was accomplished at end
  dailyTasks: jsonb('daily_tasks'), // array of task strings
  status: text('status').notNull().default('IN_PROGRESS'), // IN_PROGRESS, COMPLETED
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

// Project requirements table
export const projectRequirements = pgTable('project_requirements', {
  id: uuid('id').primaryKey().defaultRandom(),
  tentativeTitle: text('tentative_title').notNull(),
  customer: text('customer').notNull(),
  projectManagerId: uuid('project_manager_id').references(() => users.id),
  projectDescription: text('project_description'),
  sampleInputFiles: jsonb('sample_input_files').$type<string[]>().default([]), // Array of file URLs/paths
  expectedOutputFiles: jsonb('expected_output_files').$type<string[]>().default([]), // Array of file URLs/paths
  status: text('status').notNull().default('PENDING'), // PENDING, APPROVED, REJECTED
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectManagerIdx: index('requirements_project_manager_idx').on(table.projectManagerId),
  statusIdx: index('requirements_status_idx').on(table.status),
}));
