# 🔄 CSV Upload Data Flow: Frontend → Backend

## Complete Journey of Your CSV File

### 📊 **Overview Flow**

```
User Browser (Frontend)
    ↓
ExcelUploadCard Component
    ↓
useUploadExcelTasks Hook
    ↓
FormData with File
    ↓
HTTP POST /api/tasks/upload-excel
    ↓
Next.js API Route Handler
    ↓
Hono Router (tasks/server/route.ts)
    ↓
sessionMiddleware (Auth Check)
    ↓
Upload Handler Function
    ↓
CSV Parsing
    ↓
Database (PostgreSQL via Drizzle ORM)
```

---

## 🎯 **Step-by-Step Code Flow**

### **STEP 1: User Interaction (Frontend)**
**File**: `src/components/excel-upload-card.tsx`

```tsx
export const ExcelUploadCard = () => {
  const [file, setFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const workspaceId = useWorkspaceId(); // Gets from URL
  const { mutate: uploadExcel } = useUploadExcelTasks(); // The hook
  
  const handleUpload = () => {
    // When user clicks "Upload Tasks"
    uploadExcel({
      file,           // ← The CSV file object
      workspaceId,    // ← From URL
      projectId,      // ← Selected from dropdown
    });
  };
  
  return (
    // UI with file input, project selector, upload button
  );
};
```

**What happens:**
1. User selects CSV file → stored in `file` state
2. User selects project → stored in `projectId` state
3. `workspaceId` automatically extracted from URL (`/workspaces/[id]`)
4. User clicks "Upload Tasks" → calls `handleUpload()`
5. Calls the `uploadExcel()` mutation function

---

### **STEP 2: Upload Hook Prepares Request**
**File**: `src/features/tasks/api/use-upload-excel-tasks.ts`

```typescript
export const useUploadExcelTasks = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ file, workspaceId, projectId }) => {
      // 1. Create FormData object (multipart/form-data)
      const formData = new FormData();
      formData.append('file', file);           // ← CSV file binary
      formData.append('workspaceId', workspaceId); // ← String
      formData.append('projectId', projectId);     // ← String

      // 2. Send HTTP POST request
      const response = await fetch('/api/tasks/upload-excel', {
        method: 'POST',
        credentials: 'include', // ← Sends session cookie
        body: formData,         // ← FormData with file
        // NO Content-Type header! Browser sets it automatically
      });

      // 3. Check response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      // 4. Return parsed JSON
      return response.json();
    },
    
    onSuccess: (data) => {
      // Show success message
      toast.success(data.data.message);
      // Refresh tasks list
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    
    onError: (error) => {
      // Show error message
      toast.error(error.message);
    },
  });

  return mutation;
};
```

**What happens:**
1. Creates `FormData` object (special format for file uploads)
2. Appends 3 pieces of data:
   - `file` → The actual CSV file (binary data)
   - `workspaceId` → UUID string
   - `projectId` → UUID string
3. Sends POST request to `/api/tasks/upload-excel`
4. **Important**: `credentials: 'include'` sends the session cookie
5. Browser automatically sets `Content-Type: multipart/form-data`

---

### **STEP 3: Next.js Routes the Request**
**File**: `src/app/api/[[...route]]/route.ts`

```typescript
import { Hono } from "hono";
import { handle } from "hono/vercel";

import auth from "@/features/auth/server/route";
import members from "@/features/members/server/route";
import projects from "@/features/projects/server/route";
import tasks from "@/features/tasks/server/route";        // ← Our handler
import workspaces from "@/features/workspaces/server/route";

// Create Hono app
const app = new Hono().basePath("/api");

// Register routes
const routes = app
  .route("/auth", auth)
  .route("/members", members)
  .route("/projects", projects)
  .route("/tasks", tasks)          // ← /api/tasks/* goes here
  .route("/workspaces", workspaces);

// Export for Next.js
export const GET = handle(app);
export const POST = handle(app);   // ← Our POST request uses this
export const PATCH = handle(app);
export const DELETE = handle(app);
```

**What happens:**
1. Next.js receives POST to `/api/tasks/upload-excel`
2. Routes to Hono framework
3. Hono sees `/api/tasks/*` → routes to tasks handler
4. Looks for `.post("/upload-excel", ...)` handler

---

### **STEP 4: Session Middleware (Authentication)**
**File**: `src/lib/session-middleware.ts`

```typescript
export const sessionMiddleware = createMiddleware(async (c, next) => {
  // 1. Extract session cookie from request
  const sessionToken = getCookie(c, AUTH_COOKIE);

  if (!sessionToken) {
    return c.json({ error: "Unauthorized" }, 401); // ❌ Stop here
  }

  // 2. Query database for session + user
  const [result] = await db
    .select({
      session: { /* session fields */ },
      user: { /* user fields */ }
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.sessionToken, sessionToken))
    .limit(1);

  if (!result) {
    return c.json({ error: "Unauthorized" }, 401); // ❌ Invalid session
  }

  // 3. Check if session expired
  if (result.session.expires < new Date()) {
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    return c.json({ error: "Session expired" }, 401); // ❌ Expired
  }

  // 4. Attach user to context
  c.set("user", result.user); // ✅ Available in handler as c.get("user")
  c.set("userId", result.user.id);

  // 5. Continue to next handler
  await next();
});
```

**What happens:**
1. Extracts cookie: `jcn-jira-clone-session`
2. Looks up session in database
3. Validates session not expired
4. Loads user data and attaches to request context
5. If any check fails → returns 401 Unauthorized
6. If all checks pass → continues to upload handler

---

### **STEP 5: Upload Handler Receives Request**
**File**: `src/features/tasks/server/route.ts`

```typescript
.post(
  "/upload-excel",
  sessionMiddleware,  // ← Runs first (auth check)
  async (c) => {
    try {
      console.log('📤 CSV Upload request received');
      
      // 1. Get authenticated user (from middleware)
      const user = c.get("user");
      console.log('👤 User:', user.email);
      
      // 2. Parse FormData from request body
      const formData = await c.req.formData();
      
      // 3. Extract fields from FormData
      const file = formData.get('file') as File;
      const workspaceId = formData.get('workspaceId') as string;
      const projectId = formData.get('projectId') as string;

      console.log('📁 File:', file?.name, 'Size:', file?.size);
      console.log('🏢 Workspace:', workspaceId);
      console.log('📊 Project:', projectId);

      // 4. Validation checks
      if (!file) {
        return c.json({ error: "No file uploaded" }, 400);
      }

      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        return c.json({ error: "File too large" }, 400);
      }

      if (!workspaceId || !projectId) {
        return c.json({ error: "Missing workspace or project" }, 400);
      }

      // 5. Check user is workspace member
      const member = await getMember({ workspaceId, userId: user.id });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // 6. Verify project exists
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project) {
        return c.json({ error: "Project not found" }, 404);
      }

      console.log('✅ User is workspace member');
      console.log('✅ Project found:', project.name);

      // Continue to CSV parsing...
```

**What happens:**
1. `sessionMiddleware` runs first → validates user
2. Extracts `user` object from context
3. Parses `FormData` from request body
4. Extracts 3 fields: `file`, `workspaceId`, `projectId`
5. Validates file exists, size < 100MB
6. Checks user has access to workspace
7. Verifies project exists

---

### **STEP 6: CSV File Processing**

```typescript
      // 7. Read CSV file content
      const fileName = file.name.toLowerCase();
      let rowsData: string[][] = [];
      
      if (fileName.endsWith('.csv')) {
        console.log(`Processing CSV: ${file.name}`);
        
        // 8. Convert File to text
        const fileContent = await file.text();
        
        // 9. Split into lines
        const lines = fileContent.split('\n').filter(line => line.trim());
        console.log(`Found ${lines.length} lines`);
        
        // 10. Parse CSV (handle commas in quotes)
        rowsData = lines.map(line => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          
          return result.map(cell => cell.replace(/^"|"$/g, '').trim());
        });
      }
```

**What happens:**
1. Checks file extension is `.csv`
2. Calls `file.text()` → converts binary File to string
3. Splits by newline `\n` → array of lines
4. Parses each line:
   - Handles commas inside quotes (e.g., "Task, with comma")
   - Splits by comma outside quotes
   - Removes quote marks
5. Result: `rowsData` = 2D array of strings

**Example:**
```javascript
// CSV content:
Epic,Story,Planned Start,Planned Completion,Responsibility
Parts,Legacy Data Migration,03-Oct-25,28-Nov-25,Arunraj

// Becomes:
[
  ["Epic", "Story", "Planned Start", "Planned Completion", "Responsibility"],
  ["Parts", "Legacy Data Migration", "03-Oct-25", "28-Nov-25", "Arunraj"]
]
```

---

### **STEP 7: Map Assignees**

```typescript
      // 11. Get unique assignee names from CSV
      const assigneeNamesSet = new Set(
        rowsData.slice(1).map(row => row[4]).filter(Boolean)
      );
      const assigneeNames = Array.from(assigneeNamesSet);
      
      // 12. Query database for users by name or email
      const assigneeMap = new Map();
      
      if (assigneeNames.length > 0) {
        const assignees = await db
          .select()
          .from(users)
          .where(
            or(
              inArray(users.name, assigneeNames),
              inArray(users.email, assigneeNames)
            )
          );
        
        // 13. Create lookup map
        assignees.forEach(assignee => {
          assigneeMap.set(assignee.name, assignee.id);
          assigneeMap.set(assignee.email, assignee.id);
        });
      }
```

**What happens:**
1. Extracts column 4 (Responsibility) from all rows
2. Creates unique set of names: `["Arunraj", "Aishwarya", ...]`
3. Queries database for users matching those names/emails
4. Creates Map for fast lookup: `"Arunraj" → "uuid-123-456"`

---

### **STEP 8: Create Tasks in Database**

```typescript
      const createdTasks = [];
      
      // 14. Process each row (skip header row 0)
      for (let i = 1; i < rowsData.length; i++) {
        const row = rowsData[i];
        
        if (row.length < 2 || !row[1]) continue; // Skip empty
        
        // 15. Extract data from CSV columns
        const epic = row[0]?.trim() || '';
        const story = row[1]?.trim() || '';
        const plannedStart = row[2]?.trim() || '';
        const plannedCompletion = row[3]?.trim() || '';
        const responsibility = row[4]?.trim() || '';
        
        // 16. Find assignee ID
        let assigneeId = assigneeMap.get(responsibility) || user.id;
        
        // 17. Parse due date
        const dueDate = parseDate(plannedCompletion);
        
        // 18. Build task object
        const taskData = {
          summary: story,                    // ← Task title
          issueId: `TASK-${Date.now()}-${i}`, // ← Unique ID
          issueType: "Task",
          status: TaskStatus.TODO,           // ← Default status
          projectName: project.name,
          priority: TaskPriority.MEDIUM,
          assigneeId,                        // ← User ID
          reporterId: user.id,
          creatorId: user.id,
          description: `Epic: ${epic}\nPlanned Start: ${plannedStart}`,
          projectId,                         // ← From request
          workspaceId,                       // ← From request
          dueDate,                           // ← Parsed date
          estimatedHours: null,
          actualHours: 0,
          labels: epic ? JSON.stringify([epic]) : null,
          position: 1000 + i,
        };

        // 19. Insert into database
        try {
          const [newTask] = await db
            .insert(tasks)
            .values(taskData)
            .returning();
          
          createdTasks.push(newTask);
          console.log(`✅ Created task ${i}: ${story}`);
        } catch (error) {
          console.error(`❌ Error creating task ${i}:`, error);
        }
      }
```

**What happens:**
1. Loops through each CSV row (starting at row 1, skipping header)
2. Extracts 5 columns: Epic, Story, Start, Completion, Responsibility
3. Looks up assignee ID from the map we created
4. Parses due date (handles `DD-MMM-YY` format)
5. Builds task object with all required fields
6. Inserts into PostgreSQL using Drizzle ORM
7. Collects created tasks in array

---

### **STEP 9: Return Response**

```typescript
      console.log(`🎉 Upload complete! Created ${createdTasks.length} tasks`);

      // 20. Send success response
      return c.json({ 
        data: { 
          message: `Successfully imported ${createdTasks.length} tasks`,
          tasks: createdTasks 
        } 
      });
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      return c.json({ 
        error: error instanceof Error ? error.message : "Failed to process CSV" 
      }, 500);
    }
  }
);
```

**What happens:**
1. Logs success message with count
2. Returns JSON response:
   ```json
   {
     "data": {
       "message": "Successfully imported 3 tasks",
       "tasks": [ /* array of created task objects */ ]
     }
   }
   ```
3. If any error occurs → catches and returns 500 error

---

### **STEP 10: Frontend Receives Response**

Back in `use-upload-excel-tasks.ts`:

```typescript
onSuccess: (data) => {
  // 21. Show success toast
  toast.success(data.data.message); // "Successfully imported 3 tasks"
  
  // 22. Refresh tasks list
  queryClient.invalidateQueries({ queryKey: ["tasks"] });
  queryClient.invalidateQueries({ queryKey: ["task"] });
},

onError: (error) => {
  // 23. Show error toast
  toast.error(error.message);
}
```

**What happens:**
1. Shows green success notification
2. Invalidates React Query cache
3. Triggers automatic refetch of tasks
4. UI updates with new tasks

---

## 🔑 **Key Technologies Used**

### **Frontend → Backend**
- **FormData API**: Packages file + metadata for upload
- **Fetch API**: Sends HTTP POST request
- **Cookies**: `credentials: 'include'` sends session cookie

### **Backend Processing**
- **Hono Framework**: Handles routing and middleware
- **Session Middleware**: Authenticates user via cookie
- **FormData Parsing**: Extracts file and fields
- **File API**: `file.text()` reads CSV content
- **CSV Parsing**: Custom parser handles quotes and commas

### **Database**
- **Drizzle ORM**: Type-safe SQL queries
- **PostgreSQL**: Stores tasks, users, projects
- **Transactions**: Ensures data consistency

---

## 📦 **Data Formats at Each Stage**

### 1. **User Browser**
```javascript
File {
  name: "sample.csv",
  size: 1234,
  type: "text/csv",
  lastModified: 1234567890
}
```

### 2. **FormData (Request)**
```
------WebKitFormBoundary...
Content-Disposition: form-data; name="file"; filename="sample.csv"
Content-Type: text/csv

Epic,Story,Start,End,Owner
Parts,Task 1,01-Dec,15-Dec,Karan
------WebKitFormBoundary...
Content-Disposition: form-data; name="workspaceId"

5ffa8b93-d5fe-4b76-b71f-2636a01e9d87
------WebKitFormBoundary...
Content-Disposition: form-data; name="projectId"

abc-123-def-456
------WebKitFormBoundary...
```

### 3. **Parsed CSV**
```javascript
[
  ["Epic", "Story", "Start", "End", "Owner"],
  ["Parts", "Task 1", "01-Dec", "15-Dec", "Karan"]
]
```

### 4. **Task Object**
```javascript
{
  summary: "Task 1",
  issueId: "TASK-1730987654321-1",
  status: "To Do",
  assigneeId: "uuid-of-karan",
  projectId: "abc-123-def-456",
  workspaceId: "5ffa8b93-...",
  dueDate: new Date("2025-12-15"),
  // ... more fields
}
```

### 5. **Database Row**
```sql
INSERT INTO tasks (id, summary, issue_id, status, assignee_id, ...)
VALUES ('uuid', 'Task 1', 'TASK-...', 'To Do', 'uuid-karan', ...);
```

### 6. **Response JSON**
```json
{
  "data": {
    "message": "Successfully imported 1 tasks",
    "tasks": [{ "id": "uuid", "summary": "Task 1", ... }]
  }
}
```

---

## 🎯 **Summary**

**Frontend:**
1. User selects file → stored in React state
2. FormData packages file + workspace + project
3. Fetch sends POST with credentials (cookie)

**Backend:**
4. Middleware validates session cookie → gets user
5. Handler extracts FormData fields
6. Validates user access to workspace/project
7. Reads CSV file content as text
8. Parses CSV into 2D array
9. Looks up assignee IDs from database
10. Creates task objects with all fields
11. Inserts into PostgreSQL
12. Returns success response

**Frontend:**
13. Shows success toast
14. Refreshes tasks list
15. UI updates automatically

---

**The entire flow is type-safe, authenticated, and includes comprehensive error handling at each step!** 🚀
