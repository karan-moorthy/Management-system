# 📊 CSV Upload to Kanban Board - Complete Workflow Guide

## 🎯 Overview
This system implements a Jira-like workflow where you can:
1. Upload CSV/Excel files with task data
2. Tasks are automatically stored in Appwrite database
3. Tasks appear on a Kanban board grouped by status
4. Drag and drop tasks between columns (To Do, In Progress, In Review, Done)

---

## 🔄 System Flow

```
┌─────────────────┐
│   CSV Upload    │  ← User uploads CSV file
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parse CSV      │  ← Backend parses rows into task objects
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store in DB     │  ← Tasks saved to Appwrite with status "TODO"
│ (Appwrite)      │     (or status specified in CSV)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Kanban Board    │  ← Frontend displays tasks in columns
│  Display        │     grouped by status
└─────────────────┘
```

---

## 📁 CSV File Format

### Required Columns
Your CSV file should have these columns (case-insensitive):

| Column Name       | Description                          | Example                |
|-------------------|--------------------------------------|------------------------|
| `Task Name`       | Name of the task                     | "Build login page"     |
| `Description`     | Detailed description                 | "Create user auth..."  |
| `Status`          | BACKLOG/TODO/IN_PROGRESS/IN_REVIEW/DONE | "TODO"          |
| `Priority`        | LOW/MEDIUM/HIGH/CRITICAL             | "HIGH"                 |
| `Importance`      | LOW/MEDIUM/HIGH/CRITICAL             | "CRITICAL"             |
| `Due Date`        | YYYY-MM-DD format                    | "2025-12-31"           |

### Optional Columns
| Column Name       | Description                          | Example                |
|-------------------|--------------------------------------|------------------------|
| `Category`        | Task category/type                   | "Frontend"             |
| `Estimated Hours` | Time estimate                        | "8"                    |
| `Assignee Email`  | Email of person assigned             | "user@example.com"     |
| `Tags`            | Comma-separated tags                 | "urgent,frontend"      |

### Example CSV
```csv
Task Name,Description,Status,Priority,Importance,Due Date,Category,Estimated Hours
"Build login page","Create user authentication UI","TODO","HIGH","CRITICAL","2025-12-15","Frontend",8
"API integration","Connect login to backend","TODO","MEDIUM","HIGH","2025-12-20","Backend",12
"Write tests","Unit tests for auth flow","TODO","LOW","MEDIUM","2025-12-25","Testing",4
```

---

## 🚀 How to Use

### Step 1: Access the Upload Interface
1. Navigate to your workspace dashboard
2. Look for the "Bulk Task Import" or "Excel Upload" card
3. Select your workspace and project from the dropdowns

### Step 2: Prepare Your CSV File
1. Create a CSV file with the required columns (see format above)
2. Fill in your task data
3. Save as `.csv`, `.xlsx`, or `.xls`

### Step 3: Upload
1. Click "Click to upload" or drag and drop your file
2. The system will parse and validate the file
3. Click "Upload Tasks" button
4. Wait for confirmation message

### Step 4: View on Kanban Board
1. Navigate to the project's task board
2. Tasks will appear in columns based on their status:
   - **BACKLOG** - Tasks waiting to be prioritized
   - **TODO** - Tasks ready to be started
   - **IN PROGRESS** - Currently being worked on
   - **IN REVIEW** - Under review/testing
   - **DONE** - Completed tasks

### Step 5: Manage Tasks
1. **Drag and Drop**: Move tasks between columns to update status
2. **Click Task**: View/edit task details
3. **Priority Indicators**: Color-coded dots show priority and importance
   - 🔴 Critical
   - 🟠 High
   - 🟡 Medium
   - 🟢 Low

---

## 🗄️ Database Schema

### Tasks Collection in Appwrite

```typescript
{
  name: string,              // Task name
  description: string,       // Task description
  status: TaskStatus,        // BACKLOG | TODO | IN_PROGRESS | IN_REVIEW | DONE
  priority: TaskPriority,    // LOW | MEDIUM | HIGH | CRITICAL
  importance: TaskImportance,// LOW | MEDIUM | HIGH | CRITICAL
  workspaceId: string,       // Reference to workspace
  projectId: string,         // Reference to project
  assigneeId: string,        // Reference to user/member
  position: number,          // Order within column (1000, 2000, 3000...)
  dueDate: string,           // ISO date string
  category: string,          // Task category
  estimatedHours: number,    // Estimated time
  actualHours: number,       // Actual time spent
  tags: string[],            // Array of tags
  $createdAt: string,        // Auto-generated
  $updatedAt: string         // Auto-generated
}
```

---

## 🔌 API Endpoints

### 1. Upload Excel/CSV
**POST** `/api/tasks/upload-excel`

**Request:**
```
Content-Type: multipart/form-data

{
  file: File,
  workspaceId: string,
  projectId: string
}
```

**Response:**
```json
{
  "data": {
    "message": "Successfully created 15 tasks from Excel file",
    "tasksCreated": 15,
    "totalTasksInFile": 15,
    "tasks": [...]
  }
}
```

### 2. Get Tasks (for Kanban Board)
**GET** `/api/tasks?workspaceId={id}&projectId={id}`

**Response:**
```json
{
  "data": {
    "documents": [...],
    "total": 15
  }
}
```

### 3. Bulk Update (Drag & Drop)
**POST** `/api/tasks/bulk-update`

**Request:**
```json
{
  "tasks": [
    {
      "$id": "task123",
      "status": "IN_PROGRESS",
      "position": 2000
    }
  ]
}
```

---

## 🎨 Frontend Components

### Key Components

1. **ExcelUploadCard** (`src/components/excel-upload-card.tsx`)
   - File upload UI
   - Workspace/Project selection
   - Upload progress

2. **DataKanban** (`src/features/tasks/components/data-kanban.tsx`)
   - Kanban board layout
   - Drag and drop functionality
   - Task grouping by status

3. **KanbanCard** (`src/features/tasks/components/kanban-card.tsx`)
   - Individual task card
   - Priority/Importance indicators
   - Task actions menu

4. **TaskParser** (`src/features/tasks/utils/excel-parser.ts`)
   - Excel/CSV parsing logic
   - Column mapping
   - Data validation

---

## 🐛 Troubleshooting

### Problem: CSV upload fails
**Solution:**
- Check CSV format matches the required columns
- Ensure file size is under 10MB
- Verify Status values are valid (BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE)

### Problem: Tasks don't appear on board
**Solution:**
- Refresh the page
- Check that you're viewing the correct workspace and project
- Verify tasks were created (check Appwrite console)

### Problem: Can't drag tasks
**Solution:**
- Ensure you're logged in
- Check browser console for errors
- Try refreshing the page

### Problem: Duplicate tasks created
**Solution:**
- Don't upload the same CSV file multiple times
- The system doesn't automatically detect duplicates
- Manually delete duplicates from the board

---

## 📊 Workflow Examples

### Example 1: Sprint Planning
```csv
Task Name,Status,Priority,Importance,Due Date
"Sprint planning meeting","TODO","HIGH","HIGH","2025-12-01"
"User story refinement","TODO","MEDIUM","MEDIUM","2025-12-02"
"Development setup","BACKLOG","LOW","LOW","2025-12-10"
```

### Example 2: Bug Tracking
```csv
Task Name,Status,Priority,Importance,Category
"Fix login bug","TODO","CRITICAL","CRITICAL","Bug"
"Update error messages","TODO","HIGH","MEDIUM","Enhancement"
"Performance optimization","BACKLOG","MEDIUM","HIGH","Performance"
```

---

## 🔐 Security & Permissions

- ✅ Only workspace members can upload tasks
- ✅ Tasks are automatically assigned to the current user
- ✅ Project ownership is verified before creating tasks
- ✅ File size limited to prevent abuse

---

## 📈 Analytics & Reporting

After tasks are created, you can:
1. View task distribution across statuses
2. Track completion rates
3. Monitor overdue tasks
4. Analyze time estimates vs. actuals

---

## 🎯 Best Practices

1. **Consistent Naming**: Use clear, action-oriented task names
2. **Set Priorities**: Always specify priority and importance
3. **Realistic Estimates**: Provide estimated hours for better planning
4. **Use Categories**: Group related tasks with categories
5. **Regular Updates**: Move tasks through the workflow as work progresses

---

## 🔄 Integration with Existing System

Your system uses **Appwrite** as the backend database:
- Connection configured in `src/lib/appwrite.ts`
- Database ID and collection IDs in `src/config.ts`
- Session management via `src/lib/session-middleware.ts`

The upload feature is fully integrated and ready to use! 🎉
