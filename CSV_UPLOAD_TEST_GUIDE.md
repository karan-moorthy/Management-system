# 🧪 CSV Upload Testing Guide

## Current Status
- ✅ Server running on: http://localhost:3001
- ✅ Database: 1275 existing tasks
- ✅ Test CSV file created: `test-upload-debug.csv`

## 🔧 Fixes Applied

### 1. Upload Authentication Fix
**File**: `src/features/tasks/api/use-upload-excel-tasks.ts`
- Added `credentials: 'include'` to ensure cookies are sent with upload request

### 2. Cookie Configuration Fix  
**File**: `src/features/auth/server/route.ts`
- Made cookies work in localhost development
- `secure: false` and `sameSite: "lax"` for development
- Cookies will now persist in your browser

### 3. Enhanced Logging
**File**: `src/features/tasks/server/route.ts`
- Added detailed console logging throughout upload flow
- You'll see step-by-step progress in terminal

### 4. Fixed Status Check
**File**: `check-status.ts`
- Now shows correct task summary/name instead of "undefined"

## 📋 Step-by-Step Testing Instructions

### Step 1: Verify Server is Running
Open terminal and check:
```
✓ Ready in X.Xs
- Local: http://localhost:3001
```

### Step 2: Sign In
1. Open http://localhost:3001 in your browser
2. Sign in with your credentials (e.g., mlkaran2004@gmail.com)
3. **IMPORTANT**: Check browser DevTools > Application > Cookies
   - You should see a cookie named `jcn-jira-clone-session`
   - If not, sign out and sign in again

### Step 3: Navigate to Workspace
1. You'll be redirected to a workspace (e.g., `/workspaces/5ffa8b93-d5fe-4b76-b71f-2636a01e9d87`)
2. You should see the "Bulk Task Import" card on the dashboard

### Step 4: Upload Test CSV
1. Click "Click to upload" or drag the file: `test-upload-debug.csv`
2. Select a project from the dropdown (e.g., "spine", "web dev", "raja")
3. Click "Upload Tasks"

### Step 5: Monitor Server Logs
In your terminal, you should see:
```
📤 CSV Upload request received
👤 User: your-email@example.com
📁 File: test-upload-debug.csv Size: X KB
🏢 Workspace: workspace-id
📊 Project: project-id
✅ User is workspace member
✅ Project found: Project Name
Processing CSV file: test-upload-debug.csv, Size: X MB
Found 4 lines in CSV file
✅ Created task 1: Test Task 1 - CSV Upload
✅ Created task 2: Test Task 2 - Data Display
✅ Created task 3: Test Task 3 - Board View

🎉 Upload complete! Created 3 tasks
```

### Step 6: Verify Upload Success
In browser, you should see:
- ✅ Green toast notification: "Successfully imported 3 tasks"
- Task count should update on the dashboard

### Step 7: Check Database
Run in terminal:
```
npx tsx check-status.ts
```
Expected output:
- Task count should increase from 1275 to 1278 (or current count + 3)

### Step 8: View Tasks in UI
1. Click "My Tasks" in sidebar
2. You should see the 3 new tasks:
   - Test Task 1 - CSV Upload
   - Test Task 2 - Data Display
   - Test Task 3 - Board View

3. Click "Board" in sidebar
4. Tasks should appear in "To Do" column

## 🐛 Troubleshooting

### If Upload Fails with "Unauthorized"

**Check in Terminal:**
```
❌ User not a member of workspace
```

**Solution:**
1. Make sure you're logged in
2. Check you have access to the selected workspace
3. Try creating a new workspace and project, then upload there

### If Upload Fails with "No file uploaded"

**Check in Terminal:**
```
❌ No file uploaded
```

**Solution:**
1. Verify file is CSV format (not .xlsx)
2. Try selecting file again
3. Check browser console for JavaScript errors

### If Upload Fails with "Project not found"

**Check in Terminal:**
```
❌ Project not found
```

**Solution:**
1. Make sure you selected a project from dropdown
2. Create a new project if dropdown is empty
3. Refresh the page and try again

### If Tasks Don't Appear in Board/Tasks View

**Possible Causes:**
1. **Workspace Filter**: Ensure you're viewing the correct workspace
2. **Project Filter**: In tasks view, check if project filter is set correctly
3. **Status Filter**: Uploaded tasks have status "TODO"

**Quick Fix:**
- Go to workspace home page
- Check task count in "Tasks (X)" card
- If count increased, tasks were created
- Click "My Tasks" and remove all filters

### If No Server Logs Appear

**This means request isn't reaching the server:**
1. Check browser DevTools > Network tab
2. Look for POST to `/api/tasks/upload-excel`
3. Check if request has status 200, 401, 404, or 500
4. Check Response tab for error message

**Common Issues:**
- 401 = Not logged in / no session cookie
- 404 = Wrong project ID
- 500 = Server error (check terminal for details)

## 🔍 Debugging Commands

### Check Current Task Count
```bash
npx tsx check-status.ts
```

### Restart Dev Server (if needed)
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Clear Next.js Cache (if strange errors)
```bash
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

## ✅ Success Criteria

Upload is working correctly if:
1. ✅ Server logs show all success messages (✅ symbols)
2. ✅ Browser shows green success toast
3. ✅ Task count increases in database
4. ✅ Tasks appear in "My Tasks" page
5. ✅ Tasks appear in "Board" view under "To Do" column

## 📊 Test CSV Files Available

1. **test-upload-debug.csv** - 3 simple tasks for testing
2. **sample-project-tasks.csv** - 29 tasks from your original data

## 🎯 Next Steps After Successful Upload

1. Test with larger CSV file (sample-project-tasks.csv)
2. Verify all 29 tasks appear correctly
3. Check assignee mapping (Arunraj, Aishwarya, etc.)
4. Verify due dates are parsed correctly
5. Check epic labels are applied

---

**Need Help?**
If you encounter any errors not covered here, provide:
1. Server terminal output (error logs)
2. Browser console errors (F12 > Console)
3. Network tab screenshot (POST request details)
