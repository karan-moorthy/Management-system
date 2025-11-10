# RBAC System Testing Guide

## 🎯 Current Role Distribution

After role assignments on November 10, 2025:

### By Workspace:

**📁 karan**
- 👑 Karan (mlkaran2004@gmail.com) - **ADMIN**

**📁 Karan**
- 📊 Demo User (demo@example.com) - **PROJECT_MANAGER**
- 🎯 Karan (mlkaran2004@gmail.com) - **TEAM_LEAD**

**📁 My First Workspace**
- 👑 Karan (mlkaran2004@gmail.com) - **ADMIN**

**📁 raja**
- 👷 Demo User (demo@example.com) - **EMPLOYEE**
- 📈 Karan (mlkaran2004@gmail.com) - **MANAGEMENT**

### Overall Distribution:
- 👑 **ADMIN**: 2 members (33.3%)
- 📊 **PROJECT_MANAGER**: 1 member (16.7%)
- 🎯 **TEAM_LEAD**: 1 member (16.7%)
- 👷 **EMPLOYEE**: 1 member (16.7%)
- 📈 **MANAGEMENT**: 1 member (16.7%)

**Total Members**: 6

---

## 🧪 Test Scenarios by Role

### 1. ADMIN Testing (👑)

**Test User**: Karan in "karan" or "My First Workspace"

#### Expected Capabilities:
- ✅ View all workspaces, projects, and tasks
- ✅ Create/edit/delete workspaces
- ✅ Access workspace settings
- ✅ Create/edit/delete projects
- ✅ Access project settings
- ✅ Create/edit/delete any task
- ✅ Manage members (invite/remove/change roles)
- ✅ See "Settings" in navigation
- ✅ See "Members" in navigation

#### Test Cases:
1. Navigate to Workspace Settings (should show page)
2. Navigate to Project Settings (should show page)
3. Try to delete a project (button should be visible)
4. Try to edit a task assigned to someone else (should work)
5. Try to delete any task (should work)
6. Access Members page (should work)
7. Try to change member roles (should work)

---

### 2. PROJECT_MANAGER Testing (📊)

**Test User**: Demo User in "Karan" workspace

#### Expected Capabilities:
- ✅ View all workspaces, projects, and tasks
- ✅ Create/edit/delete projects
- ❌ NO access to workspace settings
- ✅ Access project settings
- ✅ Create/edit/delete any task
- ✅ Manage members (invite/remove)
- ❌ NO "Settings" in navigation
- ✅ See "Members" in navigation

#### Test Cases:
1. Navigate to Workspace Settings (should redirect or show error)
2. Navigate to Project Settings (should show page)
3. Try to delete a project (button should be visible)
4. Try to edit a task assigned to someone else (should work)
5. Try to delete any task (should work)
6. Access Members page (should work)
7. Check navigation - Settings should NOT appear
8. Check navigation - Members SHOULD appear

---

### 3. TEAM_LEAD Testing (🎯)

**Test User**: Karan in "Karan" workspace (as Team Lead)

#### Expected Capabilities:
- ✅ View all workspaces, projects, and tasks
- ✅ Create tasks
- ✅ Edit/delete own tasks
- ✅ Edit tasks assigned to them
- ❌ NO delete tasks assigned to others
- ❌ NO create/edit/delete projects
- ❌ NO access to workspace settings
- ❌ NO access to project settings
- ❌ NO manage members

#### Test Cases:
1. Navigate to Workspace Settings (should redirect)
2. Navigate to Project Settings (should redirect)
3. Try to delete a project (button should be hidden)
4. Create a new task and assign to self (should work)
5. Try to edit own task (should work)
6. Try to delete own task (should work)
7. Try to edit task assigned to someone else (should NOT see edit button)
8. Try to delete task assigned to someone else (should NOT see delete button)
9. Access Members page (should redirect)
10. Check navigation - Settings should NOT appear
11. Check navigation - Members should NOT appear

---

### 4. EMPLOYEE Testing (👷)

**Test User**: Demo User in "raja" workspace

#### Expected Capabilities:
- ✅ View all workspaces, projects, and tasks
- ✅ Create tasks
- ✅ Edit own tasks only
- ❌ NO delete tasks (even own tasks)
- ❌ NO create/edit/delete projects
- ❌ NO access to workspace settings
- ❌ NO access to project settings
- ❌ NO manage members

#### Test Cases:
1. Navigate to Workspace Settings (should redirect)
2. Navigate to Project Settings (should redirect)
3. Try to delete a project (button should be hidden)
4. Create a new task and assign to self (should work)
5. Try to edit own task (should work)
6. Try to delete own task (should NOT see delete button)
7. Try to edit task assigned to someone else (should NOT see edit button)
8. Try to delete task assigned to someone else (should NOT see delete button)
9. Access Members page (should redirect)
10. Check navigation - Settings should NOT appear
11. Check navigation - Members should NOT appear

---

### 5. MANAGEMENT Testing (📈)

**Test User**: Karan in "raja" workspace (as Management)

#### Expected Capabilities:
- ✅ View all workspaces, projects, and tasks
- ❌ NO create/edit/delete anything
- ❌ Read-only access only

#### Test Cases:
1. Navigate to Workspace Settings (should redirect)
2. Navigate to Project Settings (should redirect)
3. Try to create a project (button should be hidden)
4. Try to delete a project (button should be hidden)
5. Try to create a task (button should be hidden)
6. Try to edit any task (button should be hidden)
7. Try to delete any task (button should be hidden)
8. View analytics (should work - read-only)
9. View task lists (should work - read-only)
10. Access Members page (should redirect)
11. Check navigation - Settings should NOT appear
12. Check navigation - Members should NOT appear

---

## 📋 Systematic Testing Checklist

### UI Component Testing

#### Navigation Menu
- [ ] ADMIN sees: Settings, Members
- [ ] PROJECT_MANAGER sees: Members (no Settings)
- [ ] TEAM_LEAD sees: neither Settings nor Members
- [ ] EMPLOYEE sees: neither Settings nor Members
- [ ] MANAGEMENT sees: neither Settings nor Members

#### Workspace Home Page
- [ ] ADMIN sees: Create Project button
- [ ] PROJECT_MANAGER sees: Create Project button
- [ ] TEAM_LEAD: Create Project button hidden
- [ ] EMPLOYEE: Create Project button hidden
- [ ] MANAGEMENT: Create Project button hidden

#### Project Card Actions
- [ ] ADMIN sees: Edit, Delete buttons
- [ ] PROJECT_MANAGER sees: Edit, Delete buttons
- [ ] TEAM_LEAD sees: View only (no Edit/Delete)
- [ ] EMPLOYEE sees: View only (no Edit/Delete)
- [ ] MANAGEMENT sees: View only (no Edit/Delete)

#### Task Actions
- [ ] ADMIN: Can edit/delete all tasks
- [ ] PROJECT_MANAGER: Can edit/delete all tasks
- [ ] TEAM_LEAD: Can edit/delete own tasks only
- [ ] EMPLOYEE: Can edit own tasks, cannot delete
- [ ] MANAGEMENT: Cannot edit or delete anything

#### Settings Pages
- [ ] ADMIN: Can access workspace & project settings
- [ ] PROJECT_MANAGER: Can access project settings only
- [ ] TEAM_LEAD: Redirected from all settings pages
- [ ] EMPLOYEE: Redirected from all settings pages
- [ ] MANAGEMENT: Redirected from all settings pages

#### Members Page
- [ ] ADMIN: Full access (invite, remove, change roles)
- [ ] PROJECT_MANAGER: Full access (invite, remove, change roles)
- [ ] TEAM_LEAD: Redirected
- [ ] EMPLOYEE: Redirected
- [ ] MANAGEMENT: Redirected

---

## 🔧 Testing Commands

### View Current Roles
```bash
npm run manage:roles -- view
```

### Update a Member Role
```bash
npm run manage:roles -- update <memberId> <newRole>
```

**Available Roles**: ADMIN, PROJECT_MANAGER, TEAM_LEAD, EMPLOYEE, MANAGEMENT

### Examples:
```bash
# Make someone a Project Manager
npm run manage:roles -- update 189f18fd-549f-49f9-9284-4fbffbadcf12 PROJECT_MANAGER

# Make someone an Employee
npm run manage:roles -- update 4e8c2ce2-d713-4035-b61a-d2871f278685 EMPLOYEE

# Make someone Management (read-only)
npm run manage:roles -- update a6bb6ac5-92cc-4184-a7d5-bb6ec63dd6f8 MANAGEMENT
```

---

## 🐛 Known Issues & Limitations

### Current Limitations:
1. **Status Change Approval**: Not yet implemented (Phase 5)
   - All roles can change task status freely
   - No approval workflow for status changes

2. **Audit Logs**: Not implemented
   - No tracking of who made what changes
   - No history of role changes

3. **Bulk Operations**: Limited support
   - Cannot bulk assign roles
   - Cannot bulk update permissions

### Future Enhancements (Phase 5):
- Status change approval workflow
- Notification system for approval requests
- Audit log for all permission-related actions
- Role templates for quick assignment
- Permission inheritance for project hierarchies

---

## 🎯 Testing Strategy

### 1. Manual Testing (Recommended First)
1. Start dev server: `npm run dev`
2. Login as different users
3. Switch between workspaces
4. Test each role's capabilities
5. Verify UI elements show/hide correctly
6. Try to access restricted pages directly via URL

### 2. Browser Testing
Test in multiple browsers:
- Chrome
- Firefox
- Edge
- Safari

### 3. Mobile Testing
- Test responsive behavior
- Verify mobile menu filtering
- Check touch interactions

### 4. Performance Testing
- Monitor API response times
- Check database query performance
- Verify permission checks don't slow down UI

---

## 📊 Success Metrics

### Definition of Done:
- [ ] All 5 roles tested in each workspace
- [ ] All UI guards working correctly
- [ ] All API routes protected
- [ ] Navigation filtering working
- [ ] Settings pages properly protected
- [ ] No TypeScript/compile errors
- [ ] No console errors in browser
- [ ] All permission checks performant (<100ms)
- [ ] Documentation complete

---

## 🚀 Next Steps

After testing is complete:

### Phase 5: Advanced Features (Optional)
1. **Status Change Approval Workflow**
   - Create approval request system
   - Add notification system
   - Build approval UI components

2. **Audit Logging**
   - Track all permission-related actions
   - Store role change history
   - Create audit log viewer

3. **Enhanced Member Management**
   - Bulk role assignment
   - Role templates
   - Permission inheritance

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify DATABASE_URL in .env.local
3. Ensure user has membership in workspace
4. Check member role is valid
5. Review server logs for API errors

---

**Last Updated**: November 10, 2025
**RBAC Version**: 1.0.0
**Status**: ✅ Phases 1-4 Complete, Ready for Testing
