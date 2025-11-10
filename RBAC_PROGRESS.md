# 🚀 RBAC Implementation Progress

## ✅ Phase 1: Permission Context & Guards (COMPLETED)

### Created Files:
1. **`src/components/providers/permission-provider.tsx`**
   - Centralized permission context
   - Role-based permission checks
   - Used throughout the app

2. **`src/components/permission-guard.tsx`**
   - Conditional rendering component
   - Wraps UI elements that need permission checks

### How to Use:

#### Step 1: Wrap App with Permission Provider

In your main layout or workspace layout, wrap with PermissionProvider:

\`\`\`tsx
import { PermissionProvider } from "@/components/providers/permission-provider";
import { MemberRole } from "@/features/members/types";

// In your layout or page
<PermissionProvider
  role={currentUserRole} // Get from session/auth
  userId={currentUserId}
  workspaceId={workspaceId}
  userProjects={userProjects} // Array of project IDs user owns
  teamMemberIds={teamMemberIds} // Array of team member IDs
>
  {children}
</PermissionProvider>
\`\`\`

#### Step 2: Use Permission Guards in Components

\`\`\`tsx
import { PermissionGuard } from "@/components/permission-guard";
import { usePermissionContext } from "@/components/providers/permission-provider";

// Hide/Show Create Project Button (Admin only)
<PermissionGuard require="canCreateProject">
  <Button onClick={createProject}>Create Project</Button>
</PermissionGuard>

// Hide/Show Delete Task Button (Admin, PM only)
<PermissionGuard require="canDeleteTask">
  <Button onClick={deleteTask}>Delete Task</Button>
</PermissionGuard>

// For dynamic checks (with context)
const { canEditTask } = usePermissionContext();

{canEditTask(task.assigneeId) && (
  <Button onClick={editTask}>Edit Task</Button>
)}
\`\`\`

---

## 📋 Phase 2: UI Component Updates (NEXT)

### Components to Update:

#### 1. **Projects Component** (`src/components/projects.tsx`)
- [ ] Hide "Create Project" button for non-admins

#### 2. **Task Actions** (`src/features/tasks/components/`)
- [ ] Hide "Create Task" based on role + project ownership
- [ ] Hide "Edit Task" based on role + task ownership
- [ ] Hide "Delete Task" for non-admin/PM
- [ ] Hide "Assign Task" for employees
- [ ] Hide "Change Status" for employees

#### 3. **Member Management** (`src/features/workspaces/components/members-list.tsx`)
- [ ] Hide "Manage Users" button for non-admin/PM

#### 4. **Navigation** (`src/components/navigation.tsx`)
- [ ] Filter menu items based on permissions

---

## 🔒 Phase 3: API Route Protection (TODO)

### API Routes to Protect:

#### Project Routes:
- `POST /api/projects` - Admin only
- `PATCH /api/projects/[projectId]` - Admin only
- `DELETE /api/projects/[projectId]` - Admin only

#### Task Routes:
- `POST /api/tasks` - Check role + project ownership
- `PATCH /api/tasks/[taskId]` - Check ownership/team membership
- `DELETE /api/tasks/[taskId]` - Admin/PM only
- `PATCH /api/tasks/[taskId]/status` - Check role (not Employee)

#### User Routes:
- `POST /api/workspaces/[workspaceId]/members` - Admin/PM only
- `PATCH /api/workspaces/[workspaceId]/members/[memberId]` - Admin/PM only
- `DELETE /api/workspaces/[workspaceId]/members/[memberId]` - Admin/PM only

### Implementation Strategy:

Create middleware function:
\`\`\`typescript
// src/lib/auth-middleware.ts
export async function checkPermission(
  request: Request,
  requiredRole: MemberRole | MemberRole[],
  context?: { taskId?, projectId? }
) {
  // 1. Get current user from session
  // 2. Check if user has required role
  // 3. If context provided, check ownership
  // 4. Return true/false or throw error
}
\`\`\`

---

## 🗄️ Phase 4: Database Migration (TODO)

### Current Status:
- ✅ MemberRole enum updated with 5 roles
- ❌ Need to migrate existing data

### Migration Script Needed:
\`\`\`sql
-- Update existing ADMIN records (keep as ADMIN)
-- Update existing MEMBER records to EMPLOYEE (default)
-- Manually assign PROJECT_MANAGER, TEAM_LEAD, MANAGEMENT as needed
\`\`\`

### Steps:
1. Create migration script
2. Backup database
3. Run migration
4. Verify all users have valid roles
5. Test permission system

---

## 🔔 Phase 5: Status Change Approval Workflow (ADVANCED)

### Requirements:
- Employees can request status change
- PM/TL can approve/reject
- Notification system

### Database Schema:
\`\`\`typescript
StatusChangeRequest {
  id: string
  taskId: string
  requestedBy: string (userId)
  requestedStatus: TaskStatus
  currentStatus: TaskStatus
  reason: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  reviewedBy?: string
  reviewedAt?: Date
  createdAt: Date
}
\`\`\`

### UI Components:
1. Request Status Change Modal (Employee)
2. Pending Approvals List (PM/TL)
3. Approve/Reject Actions
4. Notification Badge

---

## 🎯 Quick Start Implementation Order

### Immediate (Do Now):
1. ✅ Create permission context provider
2. ✅ Create permission guard component
3. 🔄 Wrap workspace layout with PermissionProvider
4. 🔄 Update Projects component with guards
5. 🔄 Update Task action buttons with guards

### Short Term (This Week):
6. Add API middleware for protection
7. Test with different roles
8. Fix any permission bugs

### Long Term (Next Week):
9. Database migration script
10. Status change approval workflow
11. Comprehensive testing

---

## 🧪 Testing Plan

### Test Scenarios:

**As Admin:**
- ✅ Can create/edit/delete projects
- ✅ Can create/edit/delete/assign tasks
- ✅ Can change any task status
- ✅ Can manage users

**As Project Manager:**
- ❌ Cannot create/edit/delete projects
- ✅ Can create/edit/delete/assign tasks in their projects
- ✅ Can change task status
- ✅ Can manage users in their projects

**As Team Lead:**
- ❌ Cannot create/edit/delete projects
- ✅ Can create tasks
- ✅ Can edit team member tasks only
- ❌ Cannot delete tasks
- ✅ Can assign tasks to team
- ✅ Can change task status

**As Employee:**
- ❌ Cannot create/edit/delete projects
- ✅ Can create tasks in own projects
- ✅ Can edit own tasks only
- ❌ Cannot delete tasks
- ❌ Cannot assign tasks
- ❌ Cannot change status (needs approval)

**As Management:**
- ❌ Cannot create/edit/delete projects
- ❌ Cannot create/edit/delete/assign tasks
- ❌ Cannot change status
- ❌ Cannot comment
- ✅ Can view dashboard only

---

## 📝 Current Status Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Permission Context | ✅ Complete | 100% |
| Phase 1: UI Guards | 🔄 In Progress | 40% |
| Phase 2: API Protection | ❌ Not Started | 0% |
| Phase 3: Database Migration | ❌ Not Started | 0% |
| Phase 4: Approval Workflow | ❌ Not Started | 0% |

**Next Action:** Update UI components with permission guards

