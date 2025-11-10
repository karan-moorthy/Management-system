# 🎯 Complete RBAC Implementation Guide

## ✅ What's Been Done

1. ✅ Permission system (`src/lib/permissions.ts`)
2. ✅ Permission context provider (`src/components/providers/permission-provider.tsx`)
3. ✅ Permission guard component (`src/components/permission-guard.tsx`)
4. ✅ Member roles updated (6 roles in enum)
5. ✅ Members list UI with role badges

---

## 🚀 Implementation Steps

### Step 1: Get User's Role in Workspace

Create a helper function to fetch user's role:

**File:** `src/lib/get-user-role.ts`

\`\`\`typescript
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { MemberRole } from "@/features/members/types";

export async function getUserRole(
  userId: string,
  workspaceId: string
): Promise<MemberRole> {
  const [member] = await db
    .select()
    .from(members)
    .where(
      and(
        eq(members.userId, userId),
        eq(members.workspaceId, workspaceId)
      )
    )
    .limit(1);

  return (member?.role as MemberRole) || MemberRole.EMPLOYEE;
}
\`\`\`

---

### Step 2: Wrap Workspace Layout with Permission Provider

**File:** `src/app/(dashboard)/workspaces/[workspaceId]/layout.tsx`

\`\`\`typescript
import { getCurrent } from "@/features/auth/queries";
import { getUserRole } from "@/lib/get-user-role";
import { PermissionProvider } from "@/components/providers/permission-provider";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceId: string };
}) {
  const user = await getCurrent();
  
  if (!user) {
    redirect("/sign-in");
  }

  const role = await getUserRole(user.id, params.workspaceId);

  return (
    <PermissionProvider
      role={role}
      userId={user.id}
      workspaceId={params.workspaceId}
      userProjects={[]} // TODO: Fetch user's projects
      teamMemberIds={[]} // TODO: Fetch team members
    >
      {children}
    </PermissionProvider>
  );
}
\`\`\`

---

### Step 3: Update UI Components with Permission Guards

#### A. Projects Component - Hide Create Button

**File:** `src/components/projects.tsx`

\`\`\`typescript
import { usePermissionContext } from "@/components/providers/permission-provider";

export const Projects = () => {
  const { canCreateProject } = usePermissionContext();
  const { open } = useCreateProjectModal();

  return (
    <div>
      <div className="flex items-center justify-between">
        <p>Projects</p>
        {canCreateProject && (
          <Button onClick={open}>
            <PlusIcon />
          </Button>
        )}
      </div>
      {/* Rest of component */}
    </div>
  );
};
\`\`\`

#### B. Task Actions - Conditional Buttons

**File:** `src/features/tasks/components/task-actions.tsx`

\`\`\`typescript
import { usePermissionContext } from "@/components/providers/permission-provider";

export const TaskActions = ({ task }: { task: Task }) => {
  const { canEditTask, canDeleteTask, canAssignTask } = usePermissionContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>...</DropdownMenuTrigger>
      <DropdownMenuContent>
        {canEditTask(task.assigneeId) && (
          <DropdownMenuItem onClick={handleEdit}>
            Edit Task
          </DropdownMenuItem>
        )}
        
        {canAssignTask && (
          <DropdownMenuItem onClick={handleAssign}>
            Assign Task
          </DropdownMenuItem>
        )}
        
        {canDeleteTask && (
          <DropdownMenuItem onClick={handleDelete}>
            Delete Task
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
\`\`\`

#### C. Create Task Button

**File:** `src/features/tasks/components/data-filters.tsx` (or wherever create task button is)

\`\`\`typescript
import { usePermissionContext } from "@/components/providers/permission-provider";

export const TaskFilters = ({ projectId }: { projectId?: string }) => {
  const { canCreateTask } = usePermissionContext();

  return (
    <div>
      {canCreateTask(projectId) && (
        <Button onClick={handleCreateTask}>
          Create Task
        </Button>
      )}
    </div>
  );
};
\`\`\`

---

### Step 4: Protect API Routes

#### A. Create Auth Middleware

**File:** `src/lib/auth-protection.ts`

\`\`\`typescript
import { getCurrent } from "@/features/auth/queries";
import { getUserRole } from "@/lib/get-user-role";
import { MemberRole } from "@/features/members/types";

export async function requireAuth() {
  const user = await getCurrent();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireRole(
  workspaceId: string,
  allowedRoles: MemberRole[]
) {
  const user = await requireAuth();
  const role = await getUserRole(user.id, workspaceId);

  if (!allowedRoles.includes(role)) {
    throw new Error("Forbidden: Insufficient permissions");
  }

  return { user, role };
}
\`\`\`

#### B. Update Project API Routes

**File:** `src/features/projects/server/route.ts`

\`\`\`typescript
import { requireRole } from "@/lib/auth-protection";
import { MemberRole } from "@/features/members/types";

// Create Project - Admin Only
app.post("/", async (c) => {
  const { workspaceId } = await c.req.json();
  
  try {
    await requireRole(workspaceId, [MemberRole.ADMIN]);
    // ... rest of create logic
  } catch (error) {
    return c.json({ error: error.message }, 403);
  }
});

// Delete Project - Admin Only
app.delete("/:projectId", async (c) => {
  const { workspaceId } = c.req.query();
  
  try {
    await requireRole(workspaceId, [MemberRole.ADMIN]);
    // ... rest of delete logic
  } catch (error) {
    return c.json({ error: error.message }, 403);
  }
});
\`\`\`

#### C. Update Task API Routes

**File:** `src/features/tasks/server/route.ts`

\`\`\`typescript
// Delete Task - Admin/PM Only
app.delete("/:taskId", async (c) => {
  const { workspaceId } = c.req.query();
  
  try {
    await requireRole(workspaceId, [
      MemberRole.ADMIN,
      MemberRole.PROJECT_MANAGER
    ]);
    // ... rest of delete logic
  } catch (error) {
    return c.json({ error: error.message }, 403);
  }
});

// Change Status - Not Employee
app.patch("/:taskId/status", async (c) => {
  const { workspaceId } = c.req.query();
  
  try {
    const { role } = await requireRole(workspaceId, [
      MemberRole.ADMIN,
      MemberRole.PROJECT_MANAGER,
      MemberRole.TEAM_LEAD
    ]);
    
    if (role === MemberRole.EMPLOYEE) {
      return c.json({ error: "Employees need approval to change status" }, 403);
    }
    
    // ... rest of status change logic
  } catch (error) {
    return c.json({ error: error.message }, 403);
  }
});
\`\`\`

---

### Step 5: Database Migration

**File:** `migrate-roles.js` (run once)

\`\`\`javascript
import { db } from "./src/db/index.ts";
import { members } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";

async function migrateRoles() {
  console.log("🔄 Starting role migration...");

  // Get all members
  const allMembers = await db.select().from(members);

  console.log(`📊 Found ${allMembers.length} members`);

  // Update MEMBER role to EMPLOYEE (default)
  for (const member of allMembers) {
    if (member.role === "MEMBER") {
      await db
        .update(members)
        .set({ role: "EMPLOYEE" })
        .where(eq(members.id, member.id));
      
      console.log(`✅ Updated ${member.name} to EMPLOYEE`);
    }
  }

  console.log("✅ Migration complete!");
}

migrateRoles();
\`\`\`

**Run migration:**
\`\`\`bash
node migrate-roles.js
\`\`\`

---

### Step 6: Testing

#### Test Matrix:

| Role | Test Action | Expected Result |
|------|-------------|-----------------|
| Admin | Create Project | ✅ Success |
| PM | Create Project | ❌ Forbidden |
| Admin | Delete Task | ✅ Success |
| Employee | Delete Task | ❌ Forbidden |
| Employee | Edit Own Task | ✅ Success |
| Employee | Edit Other's Task | ❌ Forbidden |
| TL | Assign Task | ✅ Success |
| Employee | Assign Task | ❌ Forbidden |
| Management | View Dashboard | ✅ Success |
| Management | Create Task | ❌ Forbidden |

---

## 📋 Checklist

### Phase 1: UI Guards
- [ ] Create \`get-user-role.ts\` helper
- [ ] Wrap workspace layout with PermissionProvider
- [ ] Update Projects component
- [ ] Update Task actions
- [ ] Update Create Task buttons
- [ ] Update Member management buttons
- [ ] Test in browser with different roles

### Phase 2: API Protection
- [ ] Create auth-protection middleware
- [ ] Protect project routes
- [ ] Protect task routes
- [ ] Protect member routes
- [ ] Test API with different roles

### Phase 3: Database
- [ ] Create migration script
- [ ] Backup database
- [ ] Run migration
- [ ] Verify all users have valid roles

### Phase 4: Advanced
- [ ] Status change approval table
- [ ] Approval workflow UI
- [ ] Notification system

---

## 🎯 Quick Commands

\`\`\`bash
# 1. Run the migration
node migrate-roles.js

# 2. Start development server
npm run dev

# 3. Test with different users
# - Login as admin: Full access
# - Login as PM: No project creation
# - Login as employee: Limited access

# 4. Monitor API calls
# Check browser console for permission errors
\`\`\`

---

**Ready to implement?** Start with Step 1 and work through each phase!
