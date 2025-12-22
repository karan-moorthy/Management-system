# Project-Specific Task Creation Forms

## Overview
The task creation system now dynamically generates form fields based on each project's specific structure and custom columns. This allows different projects to have different fields in their task creation forms, matching their unique requirements.

## How It Works

### 1. **Project Selection**
When an admin selects a project during task creation, the form automatically:
- Fetches the project's column structure from `list_view_columns` table
- Identifies which fields are custom (not part of the standard task schema)
- Dynamically renders additional form fields based on the project's configuration

### 2. **Standard vs Custom Fields**

**Standard Fields (Always Present):**
- Summary (required)
- Issue ID (auto-generated)
- Project Name
- Description
- Due Date
- Assignee
- Status
- Priority
- Issue Type
- Project

**Custom Fields (Project-Specific):**
Any additional columns defined in the project's `list_view_columns` that are:
- Marked as visible (`isVisible: true`)
- Not system-generated (`issueId`, `createdAt`, `updatedAt`)
- Not already covered by standard fields

### 3. **Field Type Support**

The dynamic form renderer supports all column types:

| Column Type | Form Input | Example |
|------------|------------|---------|
| `text` | Text Input | Free-form text entry |
| `user` | Member Select | Dropdown with member avatars |
| `date` | Date Picker | Calendar widget |
| `select` | Text Input* | Single-line text (enhanceable to dropdown) |
| `labels` | Text Input | Comma-separated values |
| `priority` | Priority Select | Low/Medium/High/Critical with colored indicators |

*Note: `select` type currently uses text input. Can be enhanced with predefined options.

## Implementation Details

### File Modified
- **`src/features/tasks/components/create-task-form.tsx`**

### Key Changes

#### 1. Imports Added
```tsx
import { useEffect, useState } from "react";
import { useGetListViewColumns, ListViewColumn } from "../api/use-list-view-columns";
```

#### 2. State Management
```tsx
// Watch selected project to fetch its columns
const selectedProjectId = form.watch('projectId');
const { data: columns, isLoading: columnsLoading } = useGetListViewColumns(selectedProjectId || '');

// Store custom field values
const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

// Update customFields in form when custom field values change
useEffect(() => {
  form.setValue('customFields', customFieldValues);
}, [customFieldValues, form]);
```

#### 3. Helper Functions

**`isStandardField(fieldName: string)`**
- Checks if a field is part of the standard task schema
- Prevents duplicate rendering of fields that exist in both standard form and column list

**`renderDynamicField(column: ListViewColumn)`**
- Generates appropriate form input based on column type
- Handles value changes for custom fields
- Returns null for system-generated or standard fields

#### 4. Form Submission
```tsx
const payload = { 
  ...values, 
  // ... other fields
  customFields: customFieldValues, // Include all custom field values
};
```

## Usage Flow

### For Admins/Project Managers

1. **Open Create Task Modal**
   - Click "Create Task" button in task board

2. **Fill Standard Fields**
   - Enter Summary, Description, etc.

3. **Select Project**
   - Choose project from dropdown
   - Form automatically loads project-specific fields

4. **Project-Specific Fields Section Appears**
   - Section header: "Project-Specific Fields"
   - Subtext: "Fields specific to this project"
   - All custom columns render in a 2-column grid (responsive)

5. **Fill Custom Fields**
   - Enter values for project-specific fields
   - All fields are optional unless specified

6. **Submit**
   - Click "Create Task"
   - Custom fields saved to `task.customFields` JSON column

### For Employees

Individual task creation (no workspace):
- Standard fields only
- No project selection
- No custom fields

## Data Storage

### Database Schema
```typescript
tasks {
  id: string
  summary: string
  // ... standard fields
  customFields: JSON  // Stores all project-specific field values
}

list_view_columns {
  id: string
  projectId: string
  fieldName: string        // e.g., 'custom_approval_status'
  displayName: string      // e.g., 'Approval Status'
  columnType: 'text' | 'user' | 'date' | 'select' | 'labels' | 'priority'
  width: number
  position: number
  isVisible: boolean
  // ... other metadata
}
```

### Custom Fields Format
```json
{
  "custom_approval_status": "Pending",
  "custom_reviewer": "user-id-123",
  "custom_deadline_type": "Soft",
  "custom_tags": "urgent,review-needed"
}
```

## Example Scenarios

### Project A: Software Development
**Custom Fields:**
- Code Review Status (text)
- QA Reviewer (user)
- Test Coverage % (text)
- Release Version (text)

### Project B: Content Creation
**Custom Fields:**
- Content Type (select)
- Target Audience (text)
- Word Count (text)
- SEO Keywords (labels)

### Project C: Standard Project
**Custom Fields:**
- (none - only standard fields shown)

## Benefits

1. **Flexibility**: Each project can define its own fields without code changes
2. **Consistency**: Task creation matches table view structure
3. **Scalability**: Add new projects with custom fields dynamically
4. **User Experience**: Relevant fields only, no clutter
5. **Data Integrity**: All custom data stored in structured format

## Future Enhancements

### Potential Improvements

1. **Field Validation**
   - Required field enforcement
   - Type-specific validation (numbers, emails, etc.)
   - Min/max length constraints

2. **Select Field Options**
   - Predefined dropdown options for `select` type
   - Multi-select support
   - Dependent dropdown fields

3. **Field Defaults**
   - Default values for new tasks
   - Copy values from previous task

4. **Conditional Fields**
   - Show/hide fields based on other field values
   - Dynamic field dependencies

5. **Field Groups**
   - Organize fields into collapsible sections
   - Field ordering and positioning

6. **Bulk Operations**
   - Apply same custom fields to multiple tasks
   - Import custom field definitions from template

## Technical Notes

### Performance
- Columns fetched only when project selected
- Lazy loading with React Query caching
- Minimal re-renders with React Hook Form

### Error Handling
- Graceful fallback if columns fail to load
- Shows "Loading project fields..." during fetch
- Empty state if no custom fields exist

### Backward Compatibility
- Projects without custom columns: standard form only
- Existing tasks: custom fields preserved
- Migration not required - works with existing data

## API Integration

### Endpoints Used
- `GET /api/tasks/list-view/columns?projectId={id}` - Fetch project columns
- `POST /api/tasks` - Create task with customFields

### Hook Usage
```tsx
const { data: columns, isLoading } = useGetListViewColumns(projectId);
// Returns ListViewColumn[] or undefined
```

## Testing Checklist

- [ ] Create task with no project selected (admin)
- [ ] Create task with project that has no custom columns
- [ ] Create task with project that has custom text fields
- [ ] Create task with project that has custom user fields
- [ ] Create task with project that has custom date fields
- [ ] Create task with project that has mixed custom field types
- [ ] Verify custom fields save correctly in database
- [ ] Verify custom fields display in table view
- [ ] Verify custom fields display in task drawer
- [ ] Verify custom fields editable in task drawer
- [ ] Test as employee (individual tasks - no custom fields)
- [ ] Test switching between projects (fields update)
- [ ] Test with very long field names
- [ ] Test with special characters in field values

## Conclusion

This implementation provides a robust, flexible system for project-specific task creation that scales with your organization's needs. Each project can now have its own unique structure while maintaining a consistent, intuitive user experience.
