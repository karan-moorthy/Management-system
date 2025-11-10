# RBAC Phase 4: Database Migration Guide

## Overview
This guide covers the database migration process to update existing `MEMBER` roles to `EMPLOYEE` roles, completing the transition to the new 5-role RBAC system.

## Migration Script: `scripts/migrate-member-roles.ts`

### Purpose
Updates all existing "MEMBER" roles in the `members` table to "EMPLOYEE" to align with the new RBAC system.

### Safety Features
- ✅ **Dry Run Mode** - Preview changes without applying them
- ✅ **Automatic Backup** - Creates backup before making changes
- ✅ **Detailed Logging** - Shows exactly what will change
- ✅ **Verification** - Confirms migration success
- ✅ **5-Second Cancel Window** - Time to abort before execution
- ✅ **Error Handling** - Graceful failure with detailed error messages

---

## Usage

### Step 1: Preview the Migration (Dry Run)
**Always run this first to see what will change!**

```bash
npm run migrate:roles:preview
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║   RBAC Role Migration: MEMBER → EMPLOYEE                  ║
╚════════════════════════════════════════════════════════════╝

📊 Current Role Distribution:
================================
ADMIN: 1 members
MEMBER: 4 members
PROJECT_MANAGER: 1 members
Total: 6 members

🔍 PREVIEW MODE - No changes will be made
=========================================

Found 4 members with "MEMBER" role:

1. User ID: user_abc123
   Workspace ID: workspace_xyz
   Current Role: MEMBER
   Will change to: EMPLOYEE

2. User ID: user_def456
   Workspace ID: workspace_xyz
   Current Role: MEMBER
   Will change to: EMPLOYEE

... etc

✅ Dry run completed successfully
   4 members would be updated

To apply these changes, run: npm run migrate:roles
```

### Step 2: Execute the Migration
**Only run this after reviewing the preview!**

```bash
npm run migrate:roles
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║   RBAC Role Migration: MEMBER → EMPLOYEE                  ║
╚════════════════════════════════════════════════════════════╝

📊 Current Role Distribution:
================================
ADMIN: 1 members
MEMBER: 4 members
PROJECT_MANAGER: 1 members
Total: 6 members

⚠️  WARNING: This will modify your database!
   Press Ctrl+C within 5 seconds to cancel...

💾 Creating backup...
✅ Backup created with 6 members
   Timestamp: 2025-11-10T10-30-45-123Z

🚀 EXECUTING MIGRATION
=====================

Found 4 members to update...

✅ Updated member mem_001 (User: user_abc123)
✅ Updated member mem_002 (User: user_def456)
✅ Updated member mem_003 (User: user_ghi789)
✅ Updated member mem_004 (User: user_jkl012)

✅ Migration completed successfully!
   Updated 4 members from MEMBER to EMPLOYEE

🔍 Verifying Migration...
========================

✅ Verification passed: No MEMBER roles remaining

📊 Current Role Distribution:
================================
ADMIN: 1 members
EMPLOYEE: 4 members
PROJECT_MANAGER: 1 members
Total: 6 members

╔════════════════════════════════════════════════════════════╗
║   ✅ Migration Completed Successfully!                    ║
╚════════════════════════════════════════════════════════════╝
```

---

## What the Migration Does

### Before Migration
```sql
SELECT role, COUNT(*) FROM members GROUP BY role;

role              | count
------------------|------
ADMIN            | 1
MEMBER           | 4    ← Will be updated
PROJECT_MANAGER  | 1
```

### After Migration
```sql
SELECT role, COUNT(*) FROM members GROUP BY role;

role              | count
------------------|------
ADMIN            | 1
EMPLOYEE         | 4    ← Updated from MEMBER
PROJECT_MANAGER  | 1
```

---

## Pre-Migration Checklist

Before running the migration:

- [ ] **Backup Database** - Create a full database backup manually
  ```bash
  # PostgreSQL example
  pg_dump -U username -d database_name > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Run Dry Run** - Preview changes with `npm run migrate:roles:preview`

- [ ] **Review Output** - Verify the members that will be updated are correct

- [ ] **Check Production Status** - Ensure no critical operations are running

- [ ] **Notify Team** - Inform team members if running in production

- [ ] **Test in Development First** - Run migration in dev environment first

---

## Rollback Plan

If you need to rollback the migration:

### Option 1: Database Restore
```bash
# PostgreSQL example
psql -U username -d database_name < backup_file.sql
```

### Option 2: Manual Update
```sql
-- Rollback specific members if needed
UPDATE members 
SET role = 'MEMBER', updated_at = NOW() 
WHERE role = 'EMPLOYEE' 
  AND id IN ('mem_001', 'mem_002', ...);
```

### Option 3: Reverse Migration Script
```typescript
// Quick reverse script if needed
await db
  .update(members)
  .set({ role: MemberRole.MEMBER })
  .where(eq(members.role, MemberRole.EMPLOYEE));
```

---

## Troubleshooting

### Issue: "No members found to update"
**Cause:** All members already have roles other than MEMBER

**Solution:** This is normal if migration already ran or if you never had MEMBER roles. No action needed.

### Issue: "Migration failed: connection error"
**Cause:** Database connection issues

**Solution:**
1. Check DATABASE_URL in `.env.local`
2. Verify database is running
3. Test connection: `npm run db:check`

### Issue: "Some members still have MEMBER role after migration"
**Cause:** Partial migration failure

**Solution:**
1. Check error logs for specific failures
2. Run migration again (it's safe to re-run)
3. Manually update remaining members if needed

### Issue: TypeScript errors
**Cause:** MemberRole enum not found

**Solution:**
```bash
# Rebuild the project
npm run build
```

---

## Verification Steps

### 1. Check Role Distribution
```typescript
// In your app or via database
const members = await db.select().from(members);
const roleStats = members.reduce((acc, m) => {
  acc[m.role] = (acc[m.role] || 0) + 1;
  return acc;
}, {});
console.log(roleStats);
```

### 2. Test Permissions
Log in as different users and verify:
- Employees can edit own tasks
- Employees cannot delete tasks
- Employees cannot change task status
- Navigation menu correct for each role

### 3. API Testing
```bash
# Test that API respects new EMPLOYEE role
curl -X POST /api/tasks \
  -H "Content-Type: application/json" \
  -d '{"summary":"Test","status":"TODO","workspaceId":"..."}'
```

---

## Migration Timeline

### Development Environment
1. ✅ Run preview: `npm run migrate:roles:preview`
2. ✅ Execute: `npm run migrate:roles`
3. ✅ Verify: Check role distribution
4. ✅ Test: Log in as different roles

**Estimated Time:** 5-10 minutes

### Production Environment
1. 📋 Schedule maintenance window (optional)
2. 💾 Create full database backup
3. 🔍 Run preview in production
4. ⏸️  Pause if needed (5-second window)
5. 🚀 Execute migration
6. ✅ Verify success
7. 🧪 Test critical paths
8. 📢 Notify team completion

**Estimated Time:** 15-30 minutes

---

## Post-Migration Tasks

### 1. Update Documentation
- [ ] Update role descriptions for users
- [ ] Update admin guides
- [ ] Update API documentation

### 2. Monitor System
- [ ] Check error logs for permission issues
- [ ] Monitor user feedback
- [ ] Track support tickets

### 3. Clean Up
- [ ] Remove old backup files after 30 days
- [ ] Archive migration logs
- [ ] Update team wiki/docs

---

## FAQs

**Q: Is this migration reversible?**
A: Yes, you can restore from backup or manually update roles back to MEMBER.

**Q: Will users be logged out?**
A: No, existing sessions continue to work. Permissions apply immediately.

**Q: What happens to users currently logged in?**
A: Their permissions update immediately on the next API call or page refresh.

**Q: Can I run this multiple times?**
A: Yes, it's idempotent. Running again will show "0 members to update."

**Q: What if I have custom roles?**
A: The script only updates MEMBER → EMPLOYEE. Other roles are untouched.

**Q: Do I need to restart the server?**
A: No, the changes take effect immediately.

---

## Success Criteria

✅ **Before Migration:**
- Dry run shows expected changes
- Backup created successfully
- Team notified (if production)

✅ **During Migration:**
- All members updated successfully
- No errors in console
- Verification passed

✅ **After Migration:**
- No MEMBER roles remain
- All EMPLOYEE roles working correctly
- Users can perform expected actions
- No permission errors in logs

---

## Support

If you encounter issues during migration:

1. **Check Logs:** Review migration script output
2. **Database Backup:** Ensure you have a backup
3. **Rollback:** Use backup or reverse script
4. **Document Issue:** Note error messages
5. **Team Support:** Contact development team

---

**Status:** Migration script ready ✅
**Next Action:** Run preview to see what will change
**Safety Level:** ⭐⭐⭐⭐⭐ Maximum (dry run, backup, verification)
