# 🎯 Jira-Like Dynamic Field System for Tasks

## Overview

This system implements a flexible, Jira-inspired dynamic field management system that allows companies to customize their task management according to their specific requirements. Similar to Jira's custom fields, this system enables:

- **Custom Fields**: Add any type of field to tasks (text, numbers, dates, dropdowns, etc.)
- **Issue Types**: Define custom issue types beyond Task/Bug (Story, Epic, Sub-task, etc.)
- **Workflows**: Create custom workflows with statuses and transitions
- **Boards**: Configure Kanban or Scrum boards with custom columns
- **Sprints**: Manage sprints for Scrum methodology

## Architecture

### Database Schema

```
custom_field_definitions
├── id (UUID)
├── workspace_id (FK)
├── field_name (e.g., "Sprint", "Story Points")
├── field_key (e.g., "sprint", "story_points")
├── field_type (TEXT, NUMBER, DATE, SELECT, etc.)
├── field_options (JSONB - dropdown options, etc.)
├── validation_rules (JSONB - min/max, regex, etc.)
├── applies_to_issue_types (JSONB array)
├── applies_to_projects (JSONB array)
└── UI configuration fields

custom_field_values
├── id (UUID)
├── task_id (FK)
├── field_definition_id (FK)
├── value (text value)
├── value_number (numeric value)
├── value_date (date value)
├── value_user_id (user reference)
└── value_json (complex values)

issue_type_configs
├── id (UUID)
├── workspace_id (FK)
├── issue_type_name (e.g., "Story")
├── issue_type_key (e.g., "story")
├── icon, color
└── workflow_id (FK)

workflows
├── id (UUID)
├── workspace_id (FK)
├── name
├── statuses (JSONB array)
└── transitions (JSONB array)

board_configs
├── id (UUID)
├── workspace_id (FK)
├── board_type (KANBAN/SCRUM)
├── columns (JSONB)
└── filter_config (JSONB)

sprints
├── id (UUID)
├── board_id (FK)
├── name, goal
├── start_date, end_date
└── state (FUTURE/ACTIVE/CLOSED)
```

## Features

### 1. Custom Fields

#### Supported Field Types

| Type | Description | Example Use Cases |
|------|-------------|-------------------|
| `TEXT` | Short text input | Project Code, External ID |
| `TEXTAREA` | Multi-line text | Detailed notes, Acceptance Criteria |
| `NUMBER` | Numeric input | Story Points, Effort Hours |
| `DATE` | Date picker | Release Date, Target Date |
| `DATETIME` | Date + time picker | Deployment Time |
| `SELECT` | Single-choice dropdown | Environment (Dev/QA/Prod) |
| `MULTI_SELECT` | Multiple-choice dropdown | Affected Components |
| `USER` | Single user picker | Reviewer, QA Assignee |
| `MULTI_USER` | Multiple user picker | Collaborators |
| `CHECKBOX` | Boolean field | Is Blocking, Requires Documentation |
| `URL` | URL input with validation | PR Link, Documentation Link |
| `EMAIL` | Email input | Contact Email |
| `LABELS` | Tag/label input | Technology Stack |
| `EPIC_LINK` | Link to epic | Parent Epic |
| `SPRINT` | Sprint selector | Active Sprint |

#### Field Configuration

```typescript
{
  fieldName: "Story Points",
  fieldKey: "story_points",
  fieldType: CustomFieldType.NUMBER,
  isRequired: false,
  validationRules: {
    min: 0,
    max: 100
  },
  appliesToIssueTypes: ["Story", "Task"],
  isVisibleInList: true, // Show in task table
  isVisibleInDetail: true, // Show in detail view
  isSearchable: true,
  isFilterable: true
}
```

### 2. Issue Type Customization

Define custom issue types with:
- Custom icons and colors
- Type-specific fields
- Subtask support
- Custom workflows per type

**Default Issue Types:**
- ✓ Task
- 🐛 Bug  
- 📖 Story
- ⚡ Epic
- 📋 Sub-task

**Add Custom Types:**
```typescript
{
  issueTypeName: "Spike",
  issueTypeKey: "spike",
  description: "Research or investigation task",
  icon: "🔍",
  color: "#FF6B6B",
  isSubtaskType: false
}
```

### 3. Workflows

Create custom workflows with statuses and transitions:

```typescript
{
  name: "Development Workflow",
  statuses: [
    { key: "todo", name: "To Do", category: "TODO", color: "#grey" },
    { key: "in_dev", name: "In Development", category: "IN_PROGRESS", color: "#blue" },
    { key: "in_review", name: "In Review", category: "IN_PROGRESS", color: "#yellow" },
    { key: "in_qa", name: "In QA", category: "IN_PROGRESS", color: "#orange" },
    { key: "done", name: "Done", category: "DONE", color: "#green" }
  ],
  transitions: [
    {
      id: "1",
      name: "Start Development",
      from: "todo",
      to: "in_dev",
      rules: { requireFields: ["assigneeId"] }
    },
    {
      id: "2",
      name: "Submit for Review",
      from: "in_dev",
      to: "in_review",
      rules: { requireComment: true, requireFields: ["pr_link"] }
    }
  ]
}
```

### 4. Board Configurations

#### Kanban Board
```typescript
{
  name: "Development Board",
  boardType: "KANBAN",
  columns: [
    {
      id: "col1",
      name: "To Do",
      statusMapping: ["todo", "backlog"],
      limit: 10, // WIP limit
      order: 1
    },
    {
      id: "col2",
      name: "In Progress",
      statusMapping: ["in_dev", "in_review"],
      limit: 5,
      order: 2
    },
    {
      id: "col3",
      name: "Done",
      statusMapping: ["done"],
      order: 3
    }
  ],
  cardColorBy: "PRIORITY",
  swimlanesBy: "ASSIGNEE"
}
```

#### Scrum Board
```typescript
{
  name: "Sprint Board",
  boardType: "SCRUM",
  sprintDurationWeeks: 2,
  // ... columns config
}
```

### 5. Sprint Management

```typescript
// Create Sprint
POST /api/tasks/custom-fields/sprints
{
  boardId: "board-uuid",
  name: "Sprint 23",
  goal: "Complete user authentication",
  startDate: "2025-01-01",
  endDate: "2025-01-14"
}

// Start Sprint
PATCH /api/tasks/custom-fields/sprints/:id/start

// Add Task to Sprint
POST /api/tasks/custom-fields/sprints/:id/tasks
{ taskId: "task-uuid" }

// Complete Sprint
PATCH /api/tasks/custom-fields/sprints/:id/complete
```

## API Endpoints

### Custom Field Definitions

```typescript
// Get all field definitions
GET /api/tasks/custom-fields/definitions?workspaceId={id}

// Create field definition
POST /api/tasks/custom-fields/definitions
{
  workspaceId: string;
  fieldName: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  // ... other config
}

// Update field definition
PATCH /api/tasks/custom-fields/definitions/:id

// Delete field definition
DELETE /api/tasks/custom-fields/definitions/:id
```

### Custom Field Values

```typescript
// Get values for a task
GET /api/tasks/custom-fields/values/:taskId

// Set single value
POST /api/tasks/custom-fields/values
{
  taskId: string;
  fieldDefinitionId: string;
  value?: string;
  valueNumber?: number;
  valueDate?: Date;
  valueUserId?: string;
  valueJson?: any;
}

// Bulk set values
POST /api/tasks/custom-fields/values/bulk
{
  taskId: string;
  values: Array<FieldValue>;
}
```

### Issue Types

```typescript
// Get issue types
GET /api/tasks/custom-fields/issue-types?workspaceId={id}

// Create issue type
POST /api/tasks/custom-fields/issue-types
{
  workspaceId: string;
  issueTypeName: string;
  issueTypeKey: string;
  icon?: string;
  color?: string;
}
```

### Boards

```typescript
// Get boards
GET /api/tasks/custom-fields/boards?workspaceId={id}

// Create board
POST /api/tasks/custom-fields/boards
{
  workspaceId: string;
  name: string;
  boardType: 'KANBAN' | 'SCRUM';
  columns: BoardColumn[];
}
```

## Usage Examples

### 1. Setting up a Software Development Workspace

```typescript
// Step 1: Create custom fields
await createCustomField({
  fieldName: "Story Points",
  fieldKey: "story_points",
  fieldType: CustomFieldType.NUMBER,
  appliesToIssueTypes: ["Story", "Task"],
  validationRules: { min: 1, max: 13 }
});

await createCustomField({
  fieldName: "PR Link",
  fieldKey: "pr_link",
  fieldType: CustomFieldType.URL,
  appliesToIssueTypes: ["Story", "Task", "Bug"]
});

await createCustomField({
  fieldName: "Environment",
  fieldKey: "environment",
  fieldType: CustomFieldType.SELECT,
  fieldOptions: {
    options: ["Development", "QA", "Staging", "Production"]
  }
});

// Step 2: Create issue types
await createIssueType({
  issueTypeName: "Story",
  issueTypeKey: "story",
  icon: "📖",
  color: "#63BA3C"
});

// Step 3: Create Scrum board
await createBoard({
  name: "Sprint Board",
  boardType: "SCRUM",
  sprintDurationWeeks: 2,
  columns: [
    { id: "1", name: "To Do", statusMapping: ["To Do"], order: 1 },
    { id: "2", name: "In Progress", statusMapping: ["In Progress"], order: 2, limit: 5 },
    { id: "3", name: "Done", statusMapping: ["Done"], order: 3 }
  ]
});
```

### 2. Creating a Task with Custom Fields

```typescript
// Create task
const task = await createTask({
  summary: "Implement user authentication",
  issueType: "Story",
  projectName: "VECV-SPINE",
  assigneeId: "user-uuid"
});

// Set custom field values
await setCustomFieldValues({
  taskId: task.id,
  values: [
    { fieldDefinitionId: "story-points-field-id", valueNumber: 8 },
    { fieldDefinitionId: "pr-link-field-id", value: "https://github.com/..." },
    { fieldDefinitionId: "environment-field-id", value: "Development" }
  ]
});
```

### 3. Running a Sprint

```typescript
// Create sprint
const sprint = await createSprint({
  boardId: "board-uuid",
  name: "Sprint 23",
  goal: "Complete authentication module",
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-01-14")
});

// Add tasks to sprint
await addTasksToSprint(sprint.id, [
  "task-1-uuid",
  "task-2-uuid",
  "task-3-uuid"
]);

// Start sprint
await startSprint(sprint.id);

// Later: Complete sprint
await completeSprint(sprint.id);
```

## Migration Guide

### Migrating Existing Tasks

When you enable custom fields, existing tasks remain unchanged. To apply custom fields to existing tasks:

1. **Define your fields** first in the workspace settings
2. **Bulk update** tasks using the API or UI
3. **Optional**: Run a migration script to set default values

### Migration Script Example

```typescript
// scripts/migrate-tasks-to-custom-fields.ts
import { db } from "@/db/drizzle";
import { customFieldValues, tasks } from "@/db/schema";

async function migrateTasksToCustomFields() {
  const allTasks = await db.select().from(tasks);
  const storyPointsFieldId = "story-points-field-uuid";
  
  for (const task of allTasks) {
    // Set default story points based on priority
    const storyPoints = task.priority === "High" ? 8 : 5;
    
    await db.insert(customFieldValues).values({
      taskId: task.id,
      fieldDefinitionId: storyPointsFieldId,
      valueNumber: storyPoints
    });
  }
}
```

## Best Practices

### 1. Field Naming
- Use clear, descriptive names
- Follow a consistent naming convention
- Use `field_key` in snake_case for API usage
- Use `Field Name` in Title Case for UI display

### 2. Field Organization
- Group related fields together using `displayOrder`
- Mark critical fields as `isRequired`
- Show only essential fields in list view (`isVisibleInList`)

### 3. Issue Type Strategy
- Start with default types (Task, Bug, Story, Epic)
- Add custom types only when necessary
- Use subtasks for task breakdown

### 4. Workflow Design
- Keep workflows simple initially
- Add complexity as needed
- Ensure all transitions are logical
- Use transition rules to enforce data quality

### 5. Board Configuration
- One board per team/project
- Use swimlanes for better organization
- Set WIP limits to prevent bottlenecks
- Configure filters to show relevant tasks only

## Performance Considerations

- **Indexes**: All foreign keys and frequently queried fields are indexed
- **Caching**: Implement caching for field definitions (rarely change)
- **Lazy Loading**: Load custom field values only when needed
- **Pagination**: Use pagination for large task lists
- **Batch Operations**: Use bulk endpoints for multiple updates

## Future Enhancements

- [ ] Field dependencies (e.g., show field X only if field Y has value Z)
- [ ] Calculated fields (e.g., auto-calculate based on other fields)
- [ ] Field history/audit log
- [ ] Import/export field configurations
- [ ] Field templates/presets
- [ ] Automation rules based on field values
- [ ] Advanced workflow conditions
- [ ] Board analytics and reports
- [ ] Sprint velocity tracking
- [ ] Burndown charts

## Support

For questions or issues, please refer to:
- API Documentation: `/docs/API.md`
- Database Schema: `/docs/DATABASE_SCHEMA.md`
- Examples: `/examples/custom-fields/`

## License

Part of the PMS1 Project Management System
