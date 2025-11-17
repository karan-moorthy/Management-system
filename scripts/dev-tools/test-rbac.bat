@echo off
REM RBAC Testing Quick Start Script for Windows
REM This script helps you quickly test the RBAC system

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║         RBAC System - Quick Testing Guide                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo 📊 Step 1: View Current Role Distribution
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
call npm run manage:roles -- view

echo.
echo 🚀 Step 2: Start Development Server
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo To test the RBAC system, you need to:
echo.
echo 1. Start the dev server:
echo    npm run dev
echo.
echo 2. Login as different users to test roles:
echo.
echo    🔐 Login Options:
echo    ┌─────────────────────────────────────────────────────────┐
echo    │ User: mlkaran2004@gmail.com                            │
echo    │ Workspaces:                                             │
echo    │   • 'karan' → ADMIN 👑                                  │
echo    │   • 'Karan' → TEAM_LEAD 🎯                              │
echo    │   • 'My First Workspace' → ADMIN 👑                     │
echo    │   • 'raja' → MANAGEMENT 📈 (read-only)                  │
echo    └─────────────────────────────────────────────────────────┘
echo.
echo    ┌─────────────────────────────────────────────────────────┐
echo    │ User: demo@example.com                                  │
echo    │ Workspaces:                                             │
echo    │   • 'Karan' → PROJECT_MANAGER 📊                        │
echo    │   • 'raja' → EMPLOYEE 👷                                │
echo    └─────────────────────────────────────────────────────────┘
echo.
echo 3. Test each role's capabilities:
echo.
echo    ✅ ADMIN (👑) - Full access
echo       • Access workspace ^& project settings
echo       • Create/edit/delete projects
echo       • Create/edit/delete any task
echo       • Manage members
echo       • See Settings ^& Members in navigation
echo.
echo    ✅ PROJECT_MANAGER (📊) - Project management
echo       • Access project settings (NOT workspace settings)
echo       • Create/edit/delete projects
echo       • Create/edit/delete any task
echo       • Manage members
echo       • See Members in navigation (NOT Settings)
echo.
echo    ✅ TEAM_LEAD (🎯) - Own task management
echo       • Create tasks
echo       • Edit/delete own tasks
echo       • View all tasks
echo       • NO project management
echo       • NO member management
echo.
echo    ✅ EMPLOYEE (👷) - Limited task access
echo       • Create tasks
echo       • Edit own tasks (cannot delete)
echo       • View all tasks
echo       • NO project management
echo.
echo    ✅ MANAGEMENT (📈) - Read-only
echo       • View everything
echo       • Cannot create/edit/delete anything
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 📖 For detailed testing instructions, see:
echo    RBAC_TESTING_GUIDE.md
echo.
echo 🔧 Useful Commands:
echo    npm run manage:roles -- view
echo    npm run manage:roles -- update ^<memberId^> ^<newRole^>
echo    npm run dev
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  Ready to test! Start the dev server with 'npm run dev'  ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
pause
