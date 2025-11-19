# Quick Integration Guide: Adding Activity Logging to Your App

## ✅ What's Been Completed

1. ✅ **Database Schema** - `activity_logs` table created with 8 indexes
2. ✅ **Migration Applied** - Table is live in your database
3. ✅ **API Endpoints** - Full CRUD for activity logs
4. ✅ **React Hooks** - `useGetActivityLogs` and `useCreateActivityLog`
5. ✅ **UI Component** - Beautiful `ActivityTimeline` component (Jira-style)
6. ✅ **Dashboard Updated** - Recent Activity now shows real activity logs
7. ✅ **Helper Functions** - Pre-built functions for common actions

---

## 🚀 Next Step: Integrate Activity Logging into Task Operations

To make your activity log system fully functional like Jira, you need to **log activities** whenever tasks are created, updated, or deleted.

### Step 1: Add Activity Logging to Task Creation

**File:** `src/features/tasks/server/route.ts`

Find the POST endpoint and add logging:

```typescript
import { db } from "@/db";
import { tasks, activityLogs } from "@/db/schema";
import { ActivityAction, EntityType, generateActivitySummary } from "@/features/activity/types";

// In the POST /tasks endpoint:
app.post("/", sessionMiddleware, async (c) => {
  const user = c.get("user");
  const { workspaceId, projectId, assigneeId, status, summary, description, dueDate } = c.req.valid("json");

  // Create the task
  const [newTask] = await db.insert(tasks).values({
    workspaceId,
    projectId,
    assigneeId,
    status,
    summary,
    description,
    dueDate,
    position: /* calculate position */,
  }).returning();

  // 🔥 LOG ACTIVITY: Task Created
  await db.insert(activityLogs).values({
    actionType: ActivityAction.TASK_CREATED,
    entityType: EntityType.TASK,
    entityId: newTask.id,
    userId: user.id,
    userName: user.name,
    workspaceId,
    projectId: projectId || null,
    taskId: newTask.id,
    summary: `${user.name} created task "${newTask.summary}"`,
  });

  console.log(`✅ Task created + Activity logged: ${newTask.summary}`);

  return c.json({ data: newTask });
});
```

---

### Step 2: Add Activity Logging to Task Updates (Status Changes)

**File:** `src/features/tasks/server/route.ts`

Find the PATCH endpoint and add logging for status changes:

```typescript
app.patch("/:taskId", sessionMiddleware, async (c) => {
  const user = c.get("user");
  const { taskId } = c.param();
  const updates = c.req.valid("json");

  // Get old task data
  const [oldTask] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  if (!oldTask) {
    return c.json({ error: "Task not found" }, 404);
  }

  // Update the task
  const [updatedTask] = await db
    .update(tasks)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();

  // 🔥 LOG ACTIVITY: Status Changed
  if (oldTask.status !== updatedTask.status) {
    await db.insert(activityLogs).values({
      actionType: ActivityAction.STATUS_CHANGED,
      entityType: EntityType.TASK,
      entityId: taskId,
      userId: user.id,
      userName: user.name,
      workspaceId: updatedTask.workspaceId,
      projectId: updatedTask.projectId,
      taskId,
      changes: {
        field: "status",
        oldValue: oldTask.status,
        newValue: updatedTask.status,
      },
      summary: `${user.name} moved "${updatedTask.summary}" from ${oldTask.status} to ${updatedTask.status}`,
    });
  }

  // 🔥 LOG ACTIVITY: Assignee Changed
  if (oldTask.assigneeId !== updatedTask.assigneeId) {
    // Fetch assignee name if needed
    const [assignee] = updatedTask.assigneeId 
      ? await db.select().from(users).where(eq(users.id, updatedTask.assigneeId))
      : [null];

    await db.insert(activityLogs).values({
      actionType: ActivityAction.ASSIGNED,
      entityType: EntityType.TASK,
      entityId: taskId,
      userId: user.id,
      userName: user.name,
      workspaceId: updatedTask.workspaceId,
      projectId: updatedTask.projectId,
      taskId,
      changes: {
        field: "assignee",
        newValue: assignee?.name || "Unassigned",
      },
      summary: `${user.name} assigned "${updatedTask.summary}" to ${assignee?.name || "Unassigned"}`,
    });
  }

  // 🔥 LOG ACTIVITY: Due Date Changed
  if (oldTask.dueDate !== updatedTask.dueDate) {
    await db.insert(activityLogs).values({
      actionType: ActivityAction.DUE_DATE_CHANGED,
      entityType: EntityType.TASK,
      entityId: taskId,
      userId: user.id,
      userName: user.name,
      workspaceId: updatedTask.workspaceId,
      projectId: updatedTask.projectId,
      taskId,
      changes: {
        field: "dueDate",
        oldValue: oldTask.dueDate || "No due date",
        newValue: updatedTask.dueDate || "No due date",
      },
      summary: `${user.name} changed due date for "${updatedTask.summary}"`,
    });
  }

  console.log(`✅ Task updated + Activities logged: ${updatedTask.summary}`);

  return c.json({ data: updatedTask });
});
```

---

### Step 3: Add Activity Logging to Bulk Updates (Kanban Drag & Drop)

**File:** `src/features/tasks/server/route.ts`

Find the bulk update endpoint:

```typescript
app.patch("/bulk", sessionMiddleware, async (c) => {
  const user = c.get("user");
  const { tasks: tasksToUpdate } = c.req.valid("json");

  for (const taskUpdate of tasksToUpdate) {
    // Get old task
    const [oldTask] = await db.select().from(tasks).where(eq(tasks.id, taskUpdate.id));

    // Update task
    await db
      .update(tasks)
      .set({ 
        status: taskUpdate.status, 
        position: taskUpdate.position,
        updatedAt: new Date() 
      })
      .where(eq(tasks.id, taskUpdate.id));

    // 🔥 LOG ACTIVITY: Column Moved (if status changed)
    if (oldTask && oldTask.status !== taskUpdate.status) {
      await db.insert(activityLogs).values({
        actionType: ActivityAction.COLUMN_MOVED,
        entityType: EntityType.TASK,
        entityId: taskUpdate.id,
        userId: user.id,
        userName: user.name,
        workspaceId: oldTask.workspaceId,
        projectId: oldTask.projectId,
        taskId: taskUpdate.id,
        changes: {
          field: "status",
          oldValue: oldTask.status,
          newValue: taskUpdate.status,
        },
        summary: `${user.name} moved "${oldTask.summary}" to ${taskUpdate.status}`,
      });
    }
  }

  console.log(`✅ Bulk update + Activities logged: ${tasksToUpdate.length} tasks`);

  return c.json({ success: true });
});
```

---

### Step 4: Add Activity Logging to Task Deletion

```typescript
app.delete("/:taskId", sessionMiddleware, async (c) => {
  const user = c.get("user");
  const { taskId } = c.param();

  // Get task before deletion
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }

  // Delete task
  await db.delete(tasks).where(eq(tasks.id, taskId));

  // 🔥 LOG ACTIVITY: Task Deleted
  await db.insert(activityLogs).values({
    actionType: ActivityAction.TASK_DELETED,
    entityType: EntityType.TASK,
    entityId: taskId,
    userId: user.id,
    userName: user.name,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    taskId: null, // Task no longer exists
    summary: `${user.name} deleted task "${task.summary}"`,
  });

  console.log(`✅ Task deleted + Activity logged: ${task.summary}`);

  return c.json({ success: true });
});
```

---

## 🎯 Testing Your Implementation

After adding activity logging, test each action:

### 1. Create a Task
```
✅ Expected: Activity log appears: "Karan created task 'Fix Bug'"
```

### 2. Change Task Status (Drag to another column)
```
✅ Expected: Activity log appears: "Karan moved 'Fix Bug' from To Do to In Progress"
```

### 3. Assign Task to Someone
```
✅ Expected: Activity log appears: "Karan assigned 'Fix Bug' to Rahul"
```

### 4. Change Due Date
```
✅ Expected: Activity log appears: "Karan changed due date for 'Fix Bug'"
```

### 5. Delete Task
```
✅ Expected: Activity log appears: "Karan deleted task 'Fix Bug'"
```

---

## 📊 Verify in UI

1. **Go to Dashboard**
   - Check "Recent Activity" section
   - Should see timeline with icons and descriptions

2. **Perform Actions**
   - Create a task → See "Task Created" activity
   - Drag task → See "Status Changed" activity
   - Assign task → See "Assigned" activity

3. **Check Formatting**
   - ✅ Icons should match action types
   - ✅ Colors should be correct (green for create, purple for status change, etc.)
   - ✅ "X minutes ago" timestamps
   - ✅ Before/after values shown as badges

---

## 🚀 Your Activity Log is Now Live!

Once you integrate these logging calls:

- ✅ Every action is tracked (like Jira)
- ✅ Beautiful timeline UI shows all changes
- ✅ Before/after values are preserved
- ✅ User attribution is automatic
- ✅ Performance is optimized (indexed queries)

**Just like Jira!** 🎉

---

## 📚 Additional Resources

- **Full Documentation:** See `docs/ACTIVITY_LOGGING_SYSTEM.md`
- **Helper Functions:** See `src/features/activity/lib/activity-helpers.ts`
- **Activity Types:** See `src/features/activity/types.ts`
- **UI Component:** See `src/features/activity/components/activity-timeline.tsx`
