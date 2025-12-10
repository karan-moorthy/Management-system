# Database Structure Documentation

## Overview
This document provides a comprehensive overview of the database structure for the Project Management System (PMS). The database is designed using PostgreSQL with Drizzle ORM and follows organizational best practices with proper indexing, relationships, and data integrity.

---

## Core Architecture

### 1. **Authentication & User Management**

#### `users` Table
**Purpose**: Central user repository with employee profile information

**Key Fields**:
- `id` (UUID, PK): Unique user identifier
- `name`, `email`: Basic credentials (unique)
- `password`: Hashed password for authentication
- **Profile Fields**:
  - `dateOfBirth`, `native`: Personal details
  - `mobileNo` (unique): Contact information
  - `designation`, `department`: Organizational role
  - `experience`: Years of experience (integer)
  - `dateOfJoining`: Employment start date
  - `skills` (JSONB): Array of technical skills

**Indexes**: email, name, mobileNo for fast lookups

**Relationships**:
- One-to-many: workspaces, projects, tasks, attendance, reports
- Referenced by: members, assignments, activity logs

#### `accounts` Table
**Purpose**: OAuth provider integration (Google, GitHub, etc.)

**Key Fields**:
- `userId` → references `users.id`
- `provider`, `providerAccountId`: OAuth credentials
- `accessToken`, `refreshToken`: Token management

#### `sessions` Table
**Purpose**: User session management

**Key Fields**:
- `sessionToken` (PK): Unique session identifier
- `userId` → references `users.id`
- `expires`: Session expiration timestamp

---

### 2. **Workspace & Organization Structure**

#### `workspaces` Table
**Purpose**: Multi-tenant workspace isolation (departments, teams, organizations)

**Key Fields**:
- `id` (UUID, PK): Workspace identifier
- `name`: Workspace name
- `imageUrl`: Workspace logo/avatar
- `inviteCode` (unique): Invitation system
- `userId` → references creator

**Indexes**: userId, inviteCode

**Cascade Behavior**: Deleting workspace removes all associated data

#### `members` Table
**Purpose**: User-workspace relationships with role-based access control

**Key Fields**:
- `id` (UUID, PK)
- `userId` → references `users.id`
- `workspaceId` → references `workspaces.id`
- `role`: ADMIN, TEAM_LEAD, PROJECT_MANAGER, EMPLOYEE, MANAGEMENT

**Indexes**: 
- Composite: (userId, workspaceId) for fast permission checks
- Individual: userId, workspaceId

**Access Control**:
- **ADMIN**: Full workspace control
- **PROJECT_MANAGER/TEAM_LEAD**: Can edit most tasks
- **EMPLOYEE**: Can only edit assigned tasks, cannot change status
- **MANAGEMENT**: Read-only access

#### `invitations` Table
**Purpose**: Workspace invitation workflow

**Key Fields**:
- `email`, `workspaceId`
- `invitedBy` → references `users.id`
- `status`: PENDING, ACCEPTED, REJECTED
- `expiresAt`: Time-limited invitations

---

### 3. **Project Management**

#### `projects` Table
**Purpose**: Project tracking and management

**Key Fields**:
- `id` (UUID, PK)
- `name`: Project name
- `workspaceId` → references `workspaces.id` (nullable)
- `postDate`: Project start date
- `tentativeEndDate`: Expected completion
- `assignees` (JSONB): Array of user IDs

**Indexes**: workspaceId

**Cascade**: Deleting workspace removes projects

#### `projectRequirements` Table
**Purpose**: Project requirement gathering and approval workflow

**Key Fields**:
- `tentativeTitle`, `customer`: Project details
- `projectManagerId` → references `users.id`
- `projectDescription`: Detailed requirements
- `dueDate`: Requirement submission deadline
- `sampleInputFiles`, `expectedOutputFiles` (JSONB): File arrays
- `status`: PENDING, APPROVED, REJECTED

**Indexes**: projectManagerId, status, dueDate

---

### 4. **Task Management (Jira-Style)**

#### `tasks` Table
**Purpose**: Core task tracking with Jira-like features

**Key Fields**:

**Identity**:
- `id` (UUID, PK)
- `issueId` (unique): Human-readable ID (e.g., VECV-601)
- `summary`: Task title/description

**Classification**:
- `issueType`: Task, Bug, Epic, Story, Sub-task, Improvement
- `status`: To Do, In Progress, IN_REVIEW, Done
- `priority`: Low, Medium, High, Critical
- `resolution`: Done, Won't Fix, Duplicate, etc.

**Relationships**:
- `assigneeId`, `reporterId`, `creatorId` → `users.id`
- `projectId` → `projects.id`
- `workspaceId` → `workspaces.id`
- `parentTaskId` → `tasks.id` (self-reference for subtasks)

**Hierarchy**:
- Supports multi-level task hierarchy via `parentTaskId`
- Cascade delete: removing parent removes all subtasks

**Timestamps**:
- `created`, `updated`, `resolved`, `dueDate`

**Bulk Upload Tracking**:
- `uploadBatchId` (text): Human-readable batch ID (PROJECTNAME_YYYYMMDD_HHMMSS_XXX)
- `uploadedAt`, `uploadedBy`: CSV upload audit trail

**Additional Fields**:
- `labels` (JSONB): Tag system
- `description`: Detailed task description
- `estimatedHours`, `actualHours`: Time tracking
- `position`: For drag-and-drop ordering
- `projectName`: Denormalized project reference

**Indexes** (13 total):
- Single: issueId, assigneeId, reporterId, status, priority, projectName, issueType, dueDate, uploadBatchId
- Composite: workspace+created, workspace+status+created, workspace+assignee+created, workspace+dueDate+created
- **Purpose**: Optimized for analytics, filtering, and reporting queries

---

### 5. **Dynamic Field System (Jira-Like Customization)**

#### `customFieldDefinitions` Table
**Purpose**: Define custom fields per workspace

**Key Fields**:
- `workspaceId` → references `workspaces.id`
- `fieldName`, `fieldKey`: Display name and internal key
- `fieldType`: TEXT, NUMBER, DATE, SELECT, MULTI_SELECT, USER, CHECKBOX, URL
- `fieldDescription`: Help text
- `isRequired`, `defaultValue`: Validation
- `fieldOptions` (JSONB): Dropdown options for SELECT types
- `validationRules` (JSONB): {min, max, pattern}

**Applicability**:
- `appliesToIssueTypes` (JSONB): Which issue types use this field
- `appliesToProjects` (JSONB): Project-specific fields

**UI Configuration**:
- `displayOrder`: Field ordering
- `isVisibleInList`, `isVisibleInDetail`: Display control
- `isSearchable`, `isFilterable`: Search/filter capabilities

**Unique Constraint**: (workspaceId, fieldKey)

#### `customFieldValues` Table
**Purpose**: Store actual field values per task

**Key Fields**:
- `taskId` → references `tasks.id`
- `fieldDefinitionId` → references `customFieldDefinitions.id`
- **Type-specific storage**:
  - `value`: String values
  - `valueNumber`: Numeric values
  - `valueDate`: Date values
  - `valueUserId` → references `users.id` (User picker fields)
  - `valueJson` (JSONB): Complex/array values

**Unique Constraint**: (taskId, fieldDefinitionId) - one value per field per task

---

### 6. **List View Configuration (Dynamic Columns)**

#### `listViewColumns` Table
**Purpose**: Configure which columns appear in the Jira-style list view per workspace

**Key Fields**:
- `workspaceId` → references `workspaces.id`
- `fieldName`: Task field name (e.g., 'issueId', 'summary', 'status')
- `displayName`: Column header text (e.g., 'Key', 'Summary')
- `columnType`: text, select, user, date, labels, priority
- `width` (integer): Column width in pixels (default 150)
- `position`: Column order (sortable)
- `isVisible`: Show/hide column
- `isSortable`, `isFilterable`: Enable sorting/filtering
- `isSystem`: System columns cannot be deleted

**Use Case**: 
- Users can add/remove columns dynamically
- Reorder columns by dragging
- Resize columns
- Hide columns without deleting
- System columns (Key, Summary) are protected

**Indexes**: workspaceId, (workspaceId + position)

---

### 7. **Board Configuration (Kanban/Scrum)**

#### `boardColumns` Table
**Purpose**: Define Kanban board columns per workspace

**Key Fields**:
- `workspaceId` → references `workspaces.id`
- `name`: Column name (e.g., "To Do", "In Progress")
- `position`: Column ordering
- `color`: Visual distinction (hex color)
- `category`: TODO, IN_PROGRESS, DONE (for grouping)
- `isDefault`: System default columns

**Use Case**: Users can create custom board columns beyond standard "To Do/In Progress/Done"

#### `boardConfigs` Table
**Purpose**: Full board configuration (multiple boards per workspace)

**Key Fields**:
- `workspaceId`, `projectId`: Scope
- `name`: Board name
- `boardType`: KANBAN or SCRUM
- `columns` (JSONB): Column configurations
- `filterConfig` (JSONB): Board-specific filters
- `cardColorBy`: Color coding strategy (PRIORITY, ASSIGNEE, etc.)
- `swimlanesBy`: Horizontal grouping
- `sprintDurationWeeks`: Scrum-specific

#### `workflows` Table
**Purpose**: Define custom status workflows per workspace

**Key Fields**:
- `workspaceId` → references `workspaces.id`
- `name`: Workflow name
- `statuses` (JSONB): Array of status objects
- `transitions` (JSONB): Allowed status changes
- `isDefault`: Default workflow for new projects

#### `issueTypeConfigs` Table
**Purpose**: Customize issue types per workspace

**Key Fields**:
- `workspaceId` → references `workspaces.id`
- `issueTypeName`, `issueTypeKey`: Type configuration
- `icon`, `color`: Visual customization
- `isSubtaskType`: Whether this is a subtask type
- `workflowId`: Associated workflow
- `isActive`: Enable/disable issue types

---

### 8. **Scrum/Agile Features**

#### `sprints` Table
**Purpose**: Sprint management for Scrum boards

**Key Fields**:
- `workspaceId`, `boardId`: Scope
- `name`, `goal`: Sprint details
- `startDate`, `endDate`: Sprint duration
- `state`: FUTURE, ACTIVE, CLOSED
- `completedAt`: Sprint closure timestamp

#### `sprintTasks` Table
**Purpose**: Task assignments to sprints

**Key Fields**:
- `sprintId` → references `sprints.id`
- `taskId` → references `tasks.id`
- `addedAt`, `removedAt`: Task movement tracking

**Unique Constraint**: (sprintId, taskId)

---

### 9. **Activity Tracking & Audit Logs**

#### `activityLogs` Table
**Purpose**: Comprehensive Jira-style activity tracking

**Key Fields**:

**Action Identification**:
- `actionType`: TASK_CREATED, TASK_UPDATED, STATUS_CHANGED, ASSIGNED, etc.
- `entityType`: TASK, PROJECT, USER, WORKSPACE
- `entityId`: ID of affected entity

**User Context**:
- `userId` → references `users.id`
- `userName`: Denormalized for fast display

**Scope Context**:
- `workspaceId`, `projectId`, `taskId`: Hierarchical context

**Change Details**:
- `changes` (JSONB):
  ```json
  {
    "field": "status",
    "oldValue": "To Do",
    "newValue": "In Progress",
    "description": "Status changed",
    "metadata": { ... }
  }
  ```
- `summary`: Human-readable description (e.g., "Karan changed status from To Do to In Progress")

**Indexes** (8 total):
- entity (entityType + entityId)
- userId, workspaceId, taskId, projectId
- createdAt, actionType
- Composite: (workspaceId + createdAt) for workspace activity feed

**Use Cases**:
- Task history timeline
- User activity feed
- Workspace audit trail
- Analytics and reporting

---

### 10. **Task Completion Workflow**

#### `taskOverviews` Table
**Purpose**: Employee task completion validation system

**Key Fields**:

**Completion Details**:
- `taskId` → references `tasks.id` (unique)
- `employeeId` → references `users.id`
- `completedWorkDescription`: What was done
- `completionMethod`: How it was completed
- `stepsFollowed`: Detailed steps/methods

**Proof of Work**:
- `proofOfWork` (JSONB):
  ```json
  {
    "screenshots": ["url1", "url2"],
    "files": ["url1"],
    "links": ["https://..."],
    "githubCommits": ["commit-hash1"]
  }
  ```

**Optional Fields**:
- `challenges`: Problems encountered
- `additionalRemarks`: Extra notes
- `timeSpent`: Time in minutes

**Review Workflow**:
- `status`: PENDING, APPROVED, REWORK
- `adminRemarks`: Admin feedback
- `reviewedBy` → references `users.id`
- `reviewedAt`: Review timestamp

**Auto-filled**:
- `taskTitle`, `employeeName`: Denormalized from related tables
- `resolvedDate`, `resolvedTime`: Completion timestamp

**Unique Constraint**: One overview per task (taskId unique)

---

### 11. **Notification System**

#### `notifications` Table
**Purpose**: User-specific task and activity notifications

**Key Fields**:

**Target**:
- `userId` → references `users.id` (recipient)
- `taskId` → references `tasks.id` (optional)

**Content**:
- `type`: TASK_REWORK, ADMIN_REMARK, TASK_APPROVED, TASK_ASSIGNED
- `title`, `message`: Notification content

**Source**:
- `actionBy` → references `users.id`
- `actionByName`: Denormalized for quick display

**Status**:
- `isRead`: 'true' or 'false' (text)
- `readAt`: Read timestamp

**Indexes**:
- userId, taskId, type, isRead
- Composite: (userId + isRead + createdAt) for unread notifications query

**Use Cases**:
- Task assignment notifications
- Status change alerts
- Admin feedback notifications
- Approval/rejection alerts

---

### 12. **Attendance & Time Tracking**

#### `attendance` Table
**Purpose**: Employee shift and daily work tracking

**Key Fields**:

**User & Scope**:
- `userId` → references `users.id`
- `workspaceId` → references `workspaces.id` (nullable)
- `projectId` → references `projects.id` (nullable)

**Time Tracking**:
- `shiftStartTime`, `shiftEndTime`: Shift boundaries
- `totalDuration`: Duration in minutes

**Work Details**:
- `endActivity`: End-of-shift summary
- `dailyTasks` (JSONB): Array of task descriptions

**Status**:
- `status`: IN_PROGRESS, COMPLETED, AUTO_COMPLETED

**Indexes**:
- userId, workspaceId, projectId
- shiftStartTime (date index)
- status
- Composite: (userId + shiftStartTime) for daily lookup

---

### 13. **Weekly Reporting**

#### `weeklyReports` Table
**Purpose**: Employee weekly work report submissions

**Key Fields**:

**Scope**:
- `userId` → references `users.id`
- `fromDate`, `toDate`: Report date range
- `department`: Auto-filled from user profile

**Content**:
- `dailyDescriptions` (JSONB):
  ```json
  {
    "2025-11-25": "Worked on authentication module",
    "2025-11-26": "Bug fixing and testing"
  }
  ```

**File Uploads**:
- `uploadedFiles` (JSONB):
  ```json
  [{
    "date": "2025-11-25",
    "fileName": "report.pdf",
    "fileUrl": "/uploads/...",
    "fileSize": 12345,
    "uploadedAt": "2025-11-25T10:30:00Z"
  }]
  ```

**Status**:
- `status`: submitted, reviewed, archived
- `isDraft`: 'true' for drafts, 'false' for submitted

**Indexes**: userId, department, fromDate, toDate, isDraft, createdAt

---

### 14. **Bug Tracking System**

#### `bugs` Table
**Purpose**: Dedicated bug tracking separate from tasks

**Key Fields**:

**Identity**:
- `bugId`: Auto-generated (BUG-001, BUG-002, etc.)
- `bugDescription`: Bug details

**Assignment**:
- `assignedTo` → references `users.id` (bug fixer)
- `reportedBy` → references `users.id` (bug reporter)
- `reportedByName`: Denormalized

**Classification**:
- `bugType`: UI/UX, Development, Testing, or custom
- `priority`: Low, Medium, High, Critical
- `status`: Open, In Progress, Resolved, Closed

**Files**:
- `fileUrl`: Reporter's attachment (screenshot, logs)
- `outputFileUrl`: Assignee's fix proof

**Context**:
- `workspaceId` → references `workspaces.id`

**Indexes**: bugId, assignedTo, bugType, status, reportedBy, workspaceId

#### `bugComments` Table
**Purpose**: Bug conversation history

**Key Fields**:
- `bugId` → references `bugs.id`
- `userId` → references `users.id`
- `userName`: Denormalized
- `comment`: Comment text
- `fileUrl`: Optional attachment
- `isSystemComment`: Auto-generated comments (e.g., "Bug reopened")

**Cascade**: Deleting bug removes all comments

---

### 15. **Custom Data Types**

#### `customDesignations` Table
**Purpose**: User-defined job designations

**Key Fields**:
- `name` (unique): Designation name
- `createdAt`: Creation timestamp

#### `customDepartments` Table
**Purpose**: User-defined departments

**Key Fields**:
- `name` (unique): Department name
- `createdAt`: Creation timestamp

#### `customBugTypes` Table
**Purpose**: User-defined bug categories

**Key Fields**:
- `name` (unique): Bug type name
- `createdAt`: Creation timestamp

---

## Data Flow Examples

### Task Lifecycle Flow

```
1. Task Created
   ├─> tasks table: new record
   ├─> activityLogs: TASK_CREATED action
   └─> notifications: assignee notified

2. Task Status Changed
   ├─> tasks table: status updated
   ├─> activityLogs: STATUS_CHANGED action with old/new values
   └─> notifications: relevant users notified

3. Task Completed by Employee
   ├─> taskOverviews: employee submits completion details
   └─> notifications: admin/reviewer notified

4. Admin Reviews Task
   ├─> taskOverviews: status updated (APPROVED/REWORK)
   ├─> tasks: status updated to Done (if approved)
   ├─> activityLogs: TASK_APPROVED action
   └─> notifications: employee notified
```

### Workspace Hierarchy Flow

```
Workspace
  ├─> Members (with roles)
  ├─> Projects
  │    └─> Tasks
  │         ├─> Subtasks (parentTaskId)
  │         ├─> Custom Field Values
  │         ├─> Activity Logs
  │         └─> Task Overviews
  ├─> Board Columns
  ├─> List View Columns
  ├─> Custom Field Definitions
  ├─> Sprints
  │    └─> Sprint Tasks
  └─> Workflows
```

---

## Indexing Strategy

### Performance Optimizations

1. **Single Column Indexes**: Fast lookups on foreign keys and frequently queried fields
2. **Composite Indexes**: Optimized for common query patterns (workspace + date, workspace + status + date)
3. **Unique Indexes**: Data integrity and uniqueness constraints
4. **JSONB Indexes**: GIN indexes on JSONB columns for array/object queries (can be added as needed)

### Query Optimization Examples

```sql
-- Fast: Uses tasks_workspace_status_created_idx
SELECT * FROM tasks 
WHERE workspace_id = 'uuid' 
  AND status = 'In Progress' 
ORDER BY created DESC;

-- Fast: Uses tasks_assignee_idx
SELECT * FROM tasks 
WHERE assignee_id = 'user-uuid';

-- Fast: Uses activity_logs_workspace_created_idx
SELECT * FROM activity_logs 
WHERE workspace_id = 'uuid' 
ORDER BY created_at DESC 
LIMIT 50;
```

---

## Data Integrity & Cascade Rules

### Cascade Delete Relationships

1. **Workspace Deletion** → Removes:
   - All members
   - All projects
   - All tasks (via projects)
   - All board/list configurations
   - All custom field definitions and values
   - All activity logs
   - All sprints and sprint tasks

2. **User Deletion** → Removes:
   - User sessions and accounts
   - Workspace memberships
   - Created workspaces
   - Attendance records
   - Weekly reports
   - Notifications
   - Bug comments

3. **Task Deletion** → Removes:
   - All subtasks (cascade via parentTaskId)
   - Custom field values
   - Task overview
   - Activity logs
   - Notifications

### Set Null Relationships

- Task assignee/reporter deletion → Set to NULL (preserve task)
- Project deletion from workspace → Project remains (workspaceId nullable)
- Reviewer deletion → reviewedBy set to NULL (preserve review data)

---

## Security Considerations

### Role-Based Access Control (RBAC)

Implemented at application layer using `members.role`:

- **Data Isolation**: Workspace-based multi-tenancy
- **Permission Checks**: Before every write operation
- **Audit Trail**: All changes logged in activityLogs
- **Sensitive Data**: Passwords hashed, tokens encrypted

### Data Validation

- **Unique Constraints**: Prevent duplicate entries (email, mobileNo, issueId)
- **Foreign Key Constraints**: Referential integrity
- **NOT NULL Constraints**: Required fields enforced
- **JSONB Schema Validation**: Application-level validation for complex objects

---

## Scalability Considerations

### Current Capacity

- **Tasks**: Handles 1275+ tasks efficiently with composite indexes
- **Pagination**: 50-task chunks for list views
- **Activity Logs**: Indexed by workspace + createdAt for fast feed queries
- **Custom Fields**: Unlimited custom fields per workspace

### Future Optimizations

1. **Partitioning**: Partition tasks by workspace_id for multi-million record scale
2. **Archiving**: Move old activity logs to archive table
3. **Materialized Views**: Pre-compute analytics queries
4. **JSONB Indexing**: Add GIN indexes for complex JSONB queries
5. **Read Replicas**: Separate read/write databases for high traffic

---

## Migration & Versioning

### Migration Files Location
`drizzle/` folder contains SQL migration files (0000-0024 as of current version)

### Key Migrations

- **0000**: Initial schema
- **0020**: Custom fields system
- **0022**: Parent task hierarchy
- **0023**: Board columns
- **0024**: List view columns (dynamic table columns)

### Migration Execution

```bash
npx drizzle-kit generate:pg  # Generate migration from schema changes
npx tsx scripts/apply-migration.ts  # Apply migration to database
```

---

## Conclusion

This database structure provides:

✅ **Scalability**: Indexed for performance with 1000+ tasks  
✅ **Flexibility**: Custom fields, dynamic columns, configurable workflows  
✅ **Auditability**: Comprehensive activity logging  
✅ **Multi-tenancy**: Workspace isolation  
✅ **Role-Based Security**: Granular permission control  
✅ **Jira-like Features**: Subtasks, sprints, custom fields, dynamic boards  
✅ **Organizational Features**: Attendance, weekly reports, bug tracking  

The structure is production-ready for organizational project management with proper indexing, cascade rules, and data integrity constraints.
