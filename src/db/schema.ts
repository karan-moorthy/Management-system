import { pgTable, uuid, text, integer, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  password: text('password'),
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
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index('projects_workspace_idx').on(table.workspaceId),
}));

// Tasks table
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('TODO'),
  priority: text('priority').default('MEDIUM'),
  importance: text('importance').default('MEDIUM'),
  category: text('category'),
  estimatedHours: integer('estimated_hours'),
  actualHours: integer('actual_hours').default(0),
  tags: jsonb('tags'),
  position: integer('position').notNull().default(1000),
  dueDate: timestamp('due_date').notNull(),
  assigneeId: uuid('assignee_id').notNull().references(() => users.id),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  assigneeIdx: index('tasks_assignee_idx').on(table.assigneeId),
  projectIdx: index('tasks_project_idx').on(table.projectId),
  workspaceIdx: index('tasks_workspace_idx').on(table.workspaceId),
  statusIdx: index('tasks_status_idx').on(table.status),
  priorityIdx: index('tasks_priority_idx').on(table.priority),
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
