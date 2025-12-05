# 🏢 PMS1 - Comprehensive System Guide

> **Complete Documentation of the Project Management System**  
> *A Jira-inspired, full-featured enterprise project management platform*

---

## 📑 Table of Contents

1. [System Overview](#-system-overview)
2. [Architecture & Tech Stack](#-architecture--tech-stack)
3. [Core Features](#-core-features)
4. [Module Documentation](#-module-documentation)
5. [Workflow Diagrams](#-workflow-diagrams)
6. [Database Schema](#-database-schema)
7. [API Reference](#-api-reference)
8. [UI/UX Guidelines](#-uiux-guidelines)

---

## 🎯 System Overview

PMS1 is a **comprehensive project management system** built with modern web technologies, designed to rival enterprise solutions like Jira. It provides:

- ✅ **Multi-workspace management** with role-based access control
- ✅ **Kanban-style task boards** with drag-and-drop functionality
- ✅ **Bug tracking system** with lifecycle management
- ✅ **Attendance management** with shift tracking
- ✅ **Activity logging** (Jira-style comprehensive audit trail)
- ✅ **Notifications system** for real-time updates
- ✅ **Weekly reporting** and requirements tracking
- ✅ **Performance optimized** for 1,000+ concurrent users

### Key Statistics
- **14 Feature Modules** working in harmony
- **19 Database Tables** with optimized indexes
- **50+ API Endpoints** with RPC architecture
- **<1 second** initial page load
- **60 FPS** smooth UI performance

---

## 🔄 Overall System Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PMS1 SYSTEM ARCHITECTURE                             │
│                    Complete Workflow & Data Flow Diagram                     │
└─────────────────────────────────────────────────────────────────────────────┘

                                  ┌──────────────┐
                                  │    USERS     │
                                  │ (Auth Layer) │
                                  └──────┬───────┘
                                         │
                          ┌──────────────┴──────────────┐
                          │                             │
                    ┌─────▼─────┐              ┌───────▼────────┐
                    │   LOGIN   │              │   REGISTER     │
                    │  Session  │              │  New Account   │
                    └─────┬─────┘              └───────┬────────┘
                          │                            │
                          └──────────┬─────────────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   WORKSPACES        │
                          │  (Multi-Tenant)     │
                          └──────────┬──────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                │                    │                    │
         ┌──────▼──────┐      ┌─────▼─────┐      ┌─────▼──────┐
         │   MEMBERS   │      │  PROJECTS │      │  SETTINGS  │
         │  (Roles)    │      │  Creation │      │  Invites   │
         └──────┬──────┘      └─────┬─────┘      └─────┬──────┘
                │                    │                   │
                │                    │                   │
                └────────┬───────────┴───────────────────┘
                         │
        ┌────────────────┼────────────────────────────────────┐
        │                │                                    │
┌───────▼───────┐ ┌──────▼──────┐ ┌────────────┐    ┌──────▼─────────┐
│     TASKS     │ │    BUGS     │ │ ATTENDANCE │    │  REQUIREMENTS  │
│   (Kanban)    │ │  (Tracker)  │ │  (Shifts)  │    │   (Planning)   │
└───────┬───────┘ └──────┬──────┘ └─────┬──────┘    └────────┬───────┘
        │                │               │                     │
        │  ┌─────────────┴───────┐       │                     │
        │  │                     │       │                     │
        ▼  ▼                     ▼       ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ACTIVITY LOGGING SYSTEM                       │
│              (Tracks ALL changes - Jira-style)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴────────────┐
                │                        │
         ┌──────▼────────┐      ┌───────▼────────┐
         │ NOTIFICATIONS │      │  RECENT        │
         │  (Real-time)  │      │  ACTIVITY      │
         └───────────────┘      │  (Timeline)    │
                                └────────────────┘


═══════════════════════════════════════════════════════════════════════════════
                            DETAILED FEATURE FLOWS
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│  1️⃣  TASK MANAGEMENT FLOW (Kanban Board)                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  User Actions:                                                               │
│  ├─ Create Task → Assign → Set Priority → Add Due Date                     │
│  ├─ Drag & Drop between columns (To Do → In Progress → Done)               │
│  ├─ Filter (Project/Assignee/Date)                                         │
│  └─ Update task details                                                     │
│          │                                                                   │
│          ▼                                                                   │
│  Database:                                                                   │
│  ├─ INSERT into tasks table                                                │
│  ├─ UPDATE task status/position                                            │
│  └─ CREATE activity_logs entry                                             │
│          │                                                                   │
│          ▼                                                                   │
│  Side Effects:                                                              │
│  ├─ Notification sent to assignee                                          │
│  ├─ Activity log created (visible in Recent Activity)                      │
│  └─ UI updates via TanStack Query invalidation                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  2️⃣  BUG TRACKING FLOW (Complete Lifecycle)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Reporter Creates Bug:                                                       │
│  ├─ Fill form (type, priority, description)                                │
│  ├─ Select assignee (bug fixer)                                            │
│  ├─ Attach file (optional)                                                 │
│  └─ Submit → Bug ID generated (BUG-001, BUG-002...)                        │
│          │                                                                   │
│          ▼                                                                   │
│  Database:                                                                   │
│  ├─ INSERT into bugs table (status: OPEN)                                  │
│  ├─ CREATE notification for assignee                                       │
│  └─ CREATE activity_logs entry                                             │
│          │                                                                   │
│          ▼                                                                   │
│  Assignee Actions:                                                          │
│  ├─ View bug → Start conversation                                          │
│  ├─ Update status: OPEN → IN PROGRESS → RESOLVED → CLOSED                 │
│  ├─ Upload output file (required for RESOLVED)                             │
│  └─ Exchange messages with reporter                                        │
│          │                                                                   │
│          ▼                                                                   │
│  Conversation System:                                                        │
│  ├─ INSERT into bug_comments table                                         │
│  ├─ Support file attachments (base64)                                      │
│  ├─ Lock when CLOSED (no new messages)                                     │
│  └─ Unlock on REOPEN (full continuity)                                     │
│          │                                                                   │
│          ▼                                                                   │
│  Notifications:                                                             │
│  ├─ BUG_ASSIGNED → Assignee notified                                       │
│  ├─ BUG_STATUS_UPDATED → Reporter notified                                 │
│  └─ BUG_COMMENT → Both parties notified                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  3️⃣  ATTENDANCE TRACKING FLOW (Shift Management)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Employee Starts Shift:                                                      │
│  ├─ Click "Start Shift"                                                    │
│  ├─ Optional: Select project                                               │
│  └─ Live timer begins                                                       │
│          │                                                                   │
│          ▼                                                                   │
│  Database:                                                                   │
│  ├─ INSERT into attendance table                                           │
│  │   └─ status: IN_PROGRESS                                                │
│  └─ shift_start_time: current timestamp                                    │
│          │                                                                   │
│          ▼                                                                   │
│  During Active Shift:                                                       │
│  ├─ Timer runs (frontend calculation)                                      │
│  ├─ Auto-ends at midnight (backend cron)                                   │
│  └─ Employee can view duration                                             │
│          │                                                                   │
│          ▼                                                                   │
│  Employee Ends Shift:                                                       │
│  ├─ Click "End Shift"                                                      │
│  ├─ Enter end activity (required)                                          │
│  ├─ Enter daily tasks (min 1 required)                                     │
│  └─ Submit                                                                  │
│          │                                                                   │
│          ▼                                                                   │
│  Database:                                                                   │
│  ├─ UPDATE attendance record                                               │
│  │   ├─ status: COMPLETED                                                  │
│  │   ├─ shift_end_time: current timestamp                                 │
│  │   ├─ total_duration: calculated (minutes)                              │
│  │   ├─ end_activity: entered text                                         │
│  │   └─ daily_tasks: JSON array                                           │
│  └─ CREATE activity_logs entry                                             │
│          │                                                                   │
│          ▼                                                                   │
│  Admin Features:                                                            │
│  ├─ View all employees' attendance                                         │
│  ├─ Filter by employee                                                      │
│  ├─ Download CSV (bulk or filtered)                                        │
│  └─ Edit daily tasks                                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  4️⃣  ACTIVITY LOGGING & NOTIFICATIONS FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ANY User Action (15+ tracked events):                                      │
│  ├─ Task created/updated/deleted                                           │
│  ├─ Bug status changed                                                      │
│  ├─ Assignee changed                                                        │
│  ├─ Project created                                                         │
│  └─ Member invited                                                          │
│          │                                                                   │
│          ▼                                                                   │
│  Activity Logger (Backend Middleware):                                      │
│  ├─ Capture action type                                                     │
│  ├─ Extract before/after values                                            │
│  ├─ Get user info (who)                                                     │
│  ├─ Get entity info (what)                                                  │
│  └─ Generate human-readable summary                                        │
│          │                                                                   │
│          ▼                                                                   │
│  Database:                                                                   │
│  ├─ INSERT into activity_logs table                                        │
│  │   ├─ action_type: TASK_CREATED, STATUS_CHANGED, etc.                   │
│  │   ├─ entity_type: TASK, BUG, PROJECT, USER                             │
│  │   ├─ changes: { field, oldValue, newValue }                            │
│  │   └─ summary: "Karan moved task to Done"                               │
│  └─ 8 indexes ensure <100ms query time                                     │
│          │                                                                   │
│          ├──────────────────┬────────────────────┐                         │
│          ▼                  ▼                    ▼                          │
│  ┌───────────────┐  ┌─────────────────┐  ┌──────────────┐                │
│  │ NOTIFICATIONS │  │ RECENT ACTIVITY │  │  AUDIT TRAIL │                │
│  │   (Real-time) │  │   (Timeline UI) │  │  (Permanent) │                │
│  └───────────────┘  └─────────────────┘  └──────────────┘                │
│          │                  │                     │                         │
│          ▼                  ▼                     ▼                          │
│  User Bell Icon      Dashboard Widget      Admin Reports                   │
│  Unread Badge        Grouped by Date       Full History                    │
│  Click to Navigate   Color-coded Icons    Search/Filter                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  5️⃣  NOTIFICATION SYSTEM FLOW                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Trigger Event:                                                             │
│  ├─ Bug assigned                                                            │
│  ├─ Task status changed                                                     │
│  ├─ Comment added                                                           │
│  └─ Member invited                                                          │
│          │                                                                   │
│          ▼                                                                   │
│  Backend (Notification Creator):                                           │
│  ├─ Determine recipient(s)                                                  │
│  ├─ Generate message                                                        │
│  ├─ Set notification type                                                   │
│  └─ INSERT into notifications table                                        │
│          │                                                                   │
│          ▼                                                                   │
│  Database:                                                                   │
│  ├─ notifications table                                                     │
│  │   ├─ user_id: recipient                                                 │
│  │   ├─ type: BUG_ASSIGNED, TASK_UPDATED, etc.                            │
│  │   ├─ message: human-readable                                            │
│  │   ├─ read: false (default)                                              │
│  │   └─ created_at: timestamp                                              │
│  └─ Indexed by user_id + read status                                       │
│          │                                                                   │
│          ▼                                                                   │
│  Frontend (Notification Bell):                                             │
│  ├─ Polls every 30 seconds (GET /api/notifications)                       │
│  ├─ Shows unread count badge                                               │
│  ├─ Displays notification dropdown                                         │
│  └─ User clicks notification                                               │
│          │                                                                   │
│          ▼                                                                   │
│  User Actions:                                                              │
│  ├─ Click notification → Navigate to relevant page                         │
│  │   └─ PATCH /api/notifications/:id/read                                 │
│  ├─ Mark as read                                                            │
│  │   └─ UPDATE notifications SET read = true                               │
│  └─ Mark all as read                                                        │
│      └─ PATCH /api/notifications/mark-all-read                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
                              DATA FLOW SUMMARY
═══════════════════════════════════════════════════════════════════════════════

┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   FRONTEND  │ ───► │   API LAYER  │ ───► │   DATABASE   │
│  (React/UI) │      │  (Hono RPC)  │      │ (PostgreSQL) │
└─────────────┘      └──────────────┘      └──────────────┘
       │                     │                      │
       │                     │                      │
       ▼                     ▼                      ▼
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│  TanStack   │      │  Validation  │      │  Drizzle ORM │
│   Query     │      │    (Zod)     │      │   (Type-safe)│
└─────────────┘      └──────────────┘      └──────────────┘
       │                     │                      │
       │                     │                      │
       └─────────────────────┴──────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  SIDE EFFECTS  │
                    ├────────────────┤
                    │ • Activity Logs │
                    │ • Notifications │
                    │ • Cache Updates │
                    │ • UI Re-renders │
                    └────────────────┘
```

---

## 🏗️ Architecture & Tech Stack

### Frontend Stack
```typescript
Framework:     Next.js 14.2.33 (App Router)
Language:      TypeScript 5.x
UI Library:    React 18
Components:    Radix UI (Dialog, Select, Dropdown, etc.)
Styling:       Tailwind CSS 3.x
Forms:         React Hook Form + Zod validation
State:         TanStack Query (React Query)
Drag & Drop:   @dnd-kit
```

### Backend Stack
```typescript
API Framework: Hono.js with RPC
ORM:          Drizzle ORM
Database:     PostgreSQL with timezone support
Auth:         Session-based with secure cookies
Validation:   Zod schemas
File Handling: Base64 data URLs
```

### Performance Features
```typescript
Rendering:     React.memo for optimal re-renders
Pagination:    Per-column lazy loading (50 items/column)
Caching:       TanStack Query with smart invalidation
DB Indexes:    8+ optimized indexes per table
GPU Accel:     CSS transform: translateZ(0)
```

---

## 🎨 Core Features

### 1. **Workspace Management**
Multi-tenant architecture where each workspace contains:
- Projects
- Tasks
- Members with roles (ADMIN/MEMBER)
- Attendance records
- Bug reports
- Activity logs

**Key Capabilities:**
- Create/edit workspaces
- Invite members via email
- Role-based permissions
- Workspace switching

---

### 2. **Task Management (Kanban Board)**

#### Features
- ✅ Drag-and-drop between columns
- ✅ Custom statuses (To Do, In Progress, Done, etc.)
- ✅ Task priorities (Low, Medium, High, Critical)
- ✅ Assignee management
- ✅ Due dates with visual indicators
- ✅ Labels/tags
- ✅ Project association
- ✅ Search and filtering

#### Performance Optimizations (Jira-Style)
```typescript
// Per-column pagination (50 tasks initially)
const INITIAL_TASKS_PER_COLUMN = 50;

// Load More button
<Button onClick={() => loadMoreTasks(column)}>
  Load 25 more
</Button>

// React.memo prevents unnecessary re-renders
export const KanbanCard = memo(KanbanCardComponent);
```

**Performance Results:**
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Initial Load | 8-10s | <1s | **90%** ⚡ |
| DOM Elements | 1,276 | 250 | **80%** 📉 |
| Memory Usage | 200MB | 50MB | **75%** 💾 |
| Drag Lag | 2-3s | <50ms | **98%** 🚀 |

---

### 3. **Bug Tracker System**

Complete bug lifecycle management with conversation threading:

#### Bug Lifecycle Flow
```
┌─────────────────────────────────────────────────────────────┐
│                     BUG LIFECYCLE                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Reporter Creates Bug                                        │
│  ├─ Fill bug form                                           │
│  ├─ Select assignee (bug fixer)                             │
│  ├─ Choose bug type (UI/UX, Development, Testing)          │
│  ├─ Set priority (Low, Medium, High, Critical)             │
│  └─ Attach files (optional)                                 │
│                    │                                         │
│                    ▼                                         │
│  Bug Status: OPEN                                           │
│  ├─ Auto-generated ID (BUG-001, BUG-002...)                │
│  ├─ Assignee receives notification                          │
│  └─ Reporter can start conversation                         │
│                    │                                         │
│                    ▼                                         │
│  Assignee Updates Status                                    │
│  ├─ OPEN → IN PROGRESS                                      │
│  │   └─ Reporter notified                                   │
│  ├─ IN PROGRESS → RESOLVED                                  │
│  │   ├─ Must upload output file (PDF/image)                │
│  │   └─ Reporter notified                                   │
│  └─ RESOLVED → CLOSED                                       │
│      ├─ Conversation locked                                 │
│      └─ Reporter notified                                   │
│                    │                                         │
│                    ▼                                         │
│  Bug Reopening (if needed)                                  │
│  ├─ Reporter can reopen closed bugs                         │
│  ├─ Status: CLOSED → OPEN                                   │
│  ├─ Conversation unlocked (full continuity preserved)       │
│  └─ Same BUG-ID maintained                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Conversation System
```
┌─────────────────────────────────────────────────────────────┐
│                  BUG CONVERSATION FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Bug Status: OPEN                                            │
│  ├─ Reporter can START conversation                         │
│  │   └─ Attach files (screenshots, logs, images)           │
│  ├─ Assignee can REPLY                                      │
│  │   └─ Attach files (fix screenshots, patches)            │
│  └─ Both can exchange messages freely                       │
│                    │                                         │
│                    ▼                                         │
│  Bug Status: IN PROGRESS                                    │
│  ├─ Reporter CANNOT edit files                              │
│  ├─ Conversation continues                                  │
│  └─ Both can still chat                                     │
│                    │                                         │
│                    ▼                                         │
│  Bug Status: RESOLVED                                       │
│  ├─ Assignee uploads OUTPUT FILE (required)                │
│  ├─ Conversation continues                                  │
│  └─ Reporter can review and close                           │
│                    │                                         │
│                    ▼                                         │
│  Bug Status: CLOSED                                         │
│  ├─ Conversation LOCKED                                     │
│  ├─ No new messages allowed                                 │
│  └─ All history preserved                                   │
│                    │                                         │
│                    ▼                                         │
│  Bug REOPENED (if needed)                                   │
│  ├─ Conversation UNLOCKED                                   │
│  ├─ Full history restored                                   │
│  └─ Continue from where it stopped                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Features
- ✅ **Role-based permissions** (Reporter vs Assignee)
- ✅ **File attachments** with preview and download
- ✅ **Status-based restrictions** (e.g., no file edits in progress)
- ✅ **Output files required** for resolution
- ✅ **Notification system** for all state changes
- ✅ **Conversation threading** with file support
- ✅ **Reopen capability** with full continuity
- ✅ **Responsive design** (mobile/tablet/desktop)

#### Database Schema
```sql
-- Bugs Table
CREATE TABLE bugs (
  id UUID PRIMARY KEY,
  bug_id TEXT UNIQUE NOT NULL,        -- BUG-001, BUG-002...
  assigned_to UUID NOT NULL,          -- Bug fixer
  bug_type TEXT NOT NULL,             -- UI/UX, Development, Testing
  bug_description TEXT NOT NULL,
  file_url TEXT,                      -- Optional attachment
  output_file_url TEXT,               -- Required for resolution
  status TEXT NOT NULL,               -- OPEN, IN PROGRESS, RESOLVED, CLOSED
  priority TEXT NOT NULL,             -- LOW, MEDIUM, HIGH, CRITICAL
  reported_by UUID NOT NULL,          -- Bug reporter
  reported_by_name TEXT NOT NULL,
  workspace_id UUID NOT NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Bug Comments Table
CREATE TABLE bug_comments (
  id UUID PRIMARY KEY,
  bug_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  file_url TEXT,                      -- Optional attachment
  is_system_comment BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL
);
```

---

### 4. **Attendance Management**

Track employee work hours with shift management:

#### Attendance Flow
```
┌─────────────────────────────────────────────────────────────┐
│                   ATTENDANCE WORKFLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Employee Starts Shift                                       │
│  ├─ Click "Start Shift" button                              │
│  ├─ Optional: Select project                                │
│  ├─ Status: IN_PROGRESS                                     │
│  └─ Live timer starts (HH:MM:SS)                            │
│                    │                                         │
│                    ▼                                         │
│  During Active Shift                                        │
│  ├─ Timer runs continuously                                 │
│  ├─ Can view current duration                               │
│  └─ Auto-ends at midnight (prevents multi-day shifts)       │
│                    │                                         │
│                    ▼                                         │
│  Employee Ends Shift                                        │
│  ├─ Click "End Shift" button                                │
│  ├─ Enter end activity (required)                           │
│  ├─ Enter daily tasks (min 1 task)                          │
│  ├─ Status: COMPLETED                                       │
│  └─ Duration calculated automatically                        │
│                    │                                         │
│                    ▼                                         │
│  Admin View (For Admins Only)                               │
│  ├─ View all employees' attendance                          │
│  ├─ Filter by employee                                      │
│  ├─ Download bulk CSV (all employees)                       │
│  ├─ Download filtered CSV (specific employee)              │
│  └─ Edit daily tasks (admin capability)                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Features
- ✅ **Shift tracking** with start/end times
- ✅ **Live timer** during active shifts
- ✅ **Project association** (optional)
- ✅ **Daily tasks entry** (required at shift end)
- ✅ **Auto-midnight cutoff** (prevents multi-day shifts)
- ✅ **Role-based views** (Employee vs Admin)
- ✅ **CSV export** (bulk + filtered)
- ✅ **Edit capabilities** for admins

#### Admin Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│  ATTENDANCE PAGE (Admin View)                                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1️⃣ ATTENDANCE TRACKER (Shared Component)                    │
│     ├─ Start/End Shift buttons                              │
│     ├─ Live timer                                            │
│     └─ Project selector                                      │
│                                                               │
│  2️⃣ MY ATTENDANCE HISTORY (Admin's Own Records)              │
│     ├─ Personal completed shifts                             │
│     ├─ Editable daily tasks                                  │
│     └─ CSV download (personal)                               │
│                                                               │
│  3️⃣ ALL EMPLOYEES ATTENDANCE (Admin Only)                    │
│     ├─ Filter dropdown: "All Employees" / Individual        │
│     ├─ Employee with record counts (e.g., "John Doe (15)")  │
│     ├─ Download All button (all employees CSV)              │
│     ├─ Download Filtered button (selected employee CSV)     │
│     └─ Comprehensive attendance table                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. **Activity Logging System (Jira-Style)**

Comprehensive audit trail tracking all changes:

#### What Gets Logged (15+ Action Types)
```
┌─────────────────────────────────────────────────────────────┐
│                   ACTIVITY LOG TYPES                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ✨ TASK_CREATED         → "Karan created task 'Fix Bug'"   │
│  🔄 STATUS_CHANGED       → "Karan moved task to Done"        │
│  ⚡ PRIORITY_CHANGED     → "Karan changed priority to High"  │
│  👤 ASSIGNED/UNASSIGNED  → "Karan assigned task to Rahul"   │
│  📅 DUE_DATE_CHANGED     → "Karan changed due date"          │
│  📝 DESCRIPTION_UPDATED  → "Karan updated description"       │
│  🏷️ LABELS_UPDATED       → "Karan added label 'Frontend'"   │
│  🗑️ TASK_DELETED         → "Karan deleted task"              │
│  📁 PROJECT_CREATED      → "Karan created project"           │
│  🔧 PROJECT_UPDATED      → "Karan updated project"           │
│  🎉 USER_JOINED          → "Rahul joined workspace"          │
│  📧 MEMBER_INVITED       → "Karan invited user@email.com"    │
│  🔑 USER_ROLE_CHANGED    → "Karan promoted Rahul to Admin"   │
│  📋 COLUMN_MOVED         → "Karan moved task to In Progress" │
│  💬 Future: Comments, Attachments, and more...              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Activity Log Flow
```
┌─────────────────────────────────────────────────────────────┐
│              ACTIVITY LOGGING WORKFLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User Action Triggered                                       │
│  ├─ Task created/updated/deleted                            │
│  ├─ Project modified                                         │
│  ├─ Member invited                                           │
│  └─ Any trackable action                                     │
│                    │                                         │
│                    ▼                                         │
│  Activity Log Created                                       │
│  ├─ Action type identified                                  │
│  ├─ User info captured (who)                                │
│  ├─ Entity info captured (what)                             │
│  ├─ Before/after values stored (changes)                    │
│  └─ Timestamp recorded (when)                               │
│                    │                                         │
│                    ▼                                         │
│  Stored in Database                                         │
│  ├─ activity_logs table                                     │
│  ├─ JSONB for flexible changes                              │
│  └─ 8 optimized indexes                                     │
│                    │                                         │
│                    ▼                                         │
│  Displayed in UI                                            │
│  ├─ ActivityTimeline component                              │
│  ├─ Grouped by date (Today, Yesterday, dates)              │
│  ├─ Color-coded icons per action type                       │
│  ├─ Before/after badges for changes                         │
│  └─ "X minutes ago" timestamps                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Performance Metrics
```
Query Speed (with 8 indexes):
├─ 50 logs:    ~20-30ms
├─ 500 logs:   ~50-80ms
├─ 1000 logs:  ~100-150ms
└─ Handles 100,000+ logs easily
```

---

### 6. **Notification System**

Real-time notifications for:
- Bug assignments
- Status updates
- Task assignments
- Comments
- Project updates
- Member invitations

#### Features
- ✅ **Unread count badge**
- ✅ **Mark as read** (individual or bulk)
- ✅ **Expand/collapse** for long messages
- ✅ **Click to navigate** to relevant page
- ✅ **Auto-refresh** every 30 seconds
- ✅ **Notification types** for filtering

---

### 7. **Profile Management** (Admin Only)

Complete employee profile system:

#### Features
- ✅ **Add Individual Profiles**
  - Basic info (name, email, designation, department)
  - Contact details (phone, address)
  - Employment details (joining date, employee ID)
  - Custom departments and designations
  - Profile photo upload
- ✅ **Bulk Import**
  - CSV upload for multiple profiles
  - Excel file support
  - Validation and error handling
- ✅ **Edit Profiles**
  - Update all profile fields
  - Change profile photo
  - Modify employment details

#### Profile Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    PROFILE MANAGEMENT FLOW                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Admin Access Required                                       │
│  ├─ Navigate to "Add Profile" or "Edit Profile"            │
│  └─ Role verification via AdminGuard                        │
│                    │                                         │
│                    ▼                                         │
│  Add Profile (Two Methods)                                  │
│  ├─ Individual Entry                                         │
│  │   ├─ Fill form fields                                    │
│  │   ├─ Upload profile photo (optional)                     │
│  │   ├─ Select/create custom department                     │
│  │   ├─ Select/create custom designation                    │
│  │   └─ Submit → Profile created                            │
│  └─ Bulk Import                                             │
│      ├─ Upload CSV/Excel file                               │
│      ├─ System validates data                               │
│      ├─ Shows preview of records                            │
│      └─ Batch insert into database                          │
│                    │                                         │
│                    ▼                                         │
│  Database Operations                                        │
│  ├─ INSERT into profiles table                              │
│  ├─ Store profile_photo_url (base64 or cloud URL)          │
│  ├─ Link to custom_departments                              │
│  ├─ Link to custom_designations                             │
│  └─ Create activity_logs entry                              │
│                    │                                         │
│                    ▼                                         │
│  Edit Profile                                               │
│  ├─ Search/select employee                                  │
│  ├─ Load existing data                                      │
│  ├─ Modify fields                                            │
│  ├─ Update profile photo                                    │
│  └─ UPDATE profiles table                                   │
│                    │                                         │
│                    ▼                                         │
│  Profile Display                                            │
│  ├─ Used in task assignments                                │
│  ├─ Shown in member lists                                   │
│  ├─ Displayed in reports                                    │
│  └─ Available in attendance records                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 8. **Report System**

Comprehensive reporting functionality:

#### Report Types
- ✅ **Admin Reports**
  - Download all attendance records
  - Download bug tracker reports
  - Download task completion reports
  - CSV export with filters
- ✅ **Employee Weekly Reports** (Non-admin users)
  - Submit weekly accomplishments
  - Link completed tasks
  - Draft and submit modes
  - Historical report viewing

#### Report Flow
```
┌─────────────────────────────────────────────────────────────┐
│                      REPORT SYSTEM FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User Role Check                                             │
│  ├─ Admin → Access Report Download page                     │
│  └─ Employee → Access Weekly Report page                    │
│                    │                                         │
│                    ▼                                         │
│  Admin Report Download                                      │
│  ├─ Select report type                                       │
│  │   ├─ Attendance records (all employees)                 │
│  │   ├─ Bug tracker (assigned/reported)                    │
│  │   ├─ Task completion stats                              │
│  │   └─ Project summaries                                  │
│  ├─ Apply filters (date range, employee, project)          │
│  ├─ Generate CSV/Excel                                      │
│  └─ Download file                                           │
│                    │                                         │
│                    ▼                                         │
│  Employee Weekly Report                                     │
│  ├─ Create new report                                       │
│  │   ├─ Select week                                         │
│  │   ├─ Enter accomplishments                              │
│  │   ├─ Link completed tasks                               │
│  │   ├─ Save as draft (optional)                           │
│  │   └─ Submit for review                                  │
│  ├─ View historical reports                                 │
│  └─ Edit draft reports                                      │
│                    │                                         │
│                    ▼                                         │
│  Database Storage                                           │
│  ├─ INSERT/UPDATE weekly_reports table                      │
│  ├─ is_draft flag for draft reports                         │
│  └─ CREATE activity_logs entry                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 9. **Requirements Tracking**

Project requirements management system:

#### Features
- ✅ **Create Requirements** (Admin only)
  - Tentative title
  - Customer information
  - Project manager assignment
  - Project description
  - Due date
  - Sample input files upload
  - Expected output files upload
- ✅ **View Requirements**
  - All requirements in Summary page
  - Status badges (Approved, Rejected, Pending)
  - Detailed modal view
  - File previews
- ✅ **Requirement Status Tracking**
  - Approved
  - Rejected
  - Pending review

#### Requirements Flow
```
┌─────────────────────────────────────────────────────────────┐
│                  REQUIREMENTS TRACKING FLOW                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Admin Creates Requirement                                   │
│  ├─ Navigate to "Add Requirements"                          │
│  ├─ Fill requirement form                                    │
│  │   ├─ Tentative title                                     │
│  │   ├─ Customer name                                       │
│  │   ├─ Select project manager (from profiles)             │
│  │   ├─ Project description                                 │
│  │   ├─ Set due date                                        │
│  │   ├─ Upload sample input files (multiple)               │
│  │   └─ Upload expected output files (multiple)            │
│  └─ Submit                                                   │
│                    │                                         │
│                    ▼                                         │
│  Database Operations                                        │
│  ├─ INSERT into requirements table                          │
│  │   ├─ Store file references (base64 or URLs)            │
│  │   ├─ Link to project manager (user_id)                 │
│  │   ├─ Set status: PENDING (default)                     │
│  │   └─ Store due_date                                     │
│  ├─ CREATE notification for project manager                 │
│  └─ CREATE activity_logs entry                              │
│                    │                                         │
│                    ▼                                         │
│  View Requirements (Summary Page)                           │
│  ├─ All users can view                                      │
│  ├─ Displayed in card grid                                  │
│  ├─ Show status badge                                       │
│  ├─ Display customer, PM, due date                          │
│  └─ Click to open detailed modal                            │
│                    │                                         │
│                    ▼                                         │
│  Requirement Details Modal                                  │
│  ├─ Full project description                                │
│  ├─ Project manager info                                    │
│  ├─ Due date and creation date                              │
│  ├─ Sample input files (preview/download)                   │
│  ├─ Expected output files (preview/download)                │
│  └─ Status indicator                                        │
│                    │                                         │
│                    ▼                                         │
│  Admin Actions (Future Enhancement)                         │
│  ├─ Approve requirement                                     │
│  ├─ Reject with reason                                      │
│  ├─ Assign to project                                       │
│  └─ Update status                                           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 10. **Solutions Section**

Custom solution modules for specific business needs:

#### Available Solutions
- ✅ **PDF to XML Converter**
  - Upload PDF files
  - Convert to structured XML
  - Download converted files
- ✅ **Other Solutions** (Expandable)
  - Video processing
  - Data comparison tools
  - Messaging integrations
  - Custom workflows

#### Solutions Flow
```
┌─────────────────────────────────────────────────────────────┐
│                     SOLUTIONS MODULE FLOW                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User Accesses Solutions                                     │
│  ├─ Navigate to "Solutions" section                         │
│  └─ Select solution type                                     │
│                    │                                         │
│                    ▼                                         │
│  PDF to XML Converter (Example)                             │
│  ├─ Upload PDF file                                         │
│  ├─ Configure conversion options                             │
│  ├─ Process file (backend service)                          │
│  ├─ Generate XML output                                     │
│  └─ Download converted file                                 │
│                    │                                         │
│                    ▼                                         │
│  Backend Processing                                         │
│  ├─ File validation                                         │
│  ├─ Conversion service execution                            │
│  ├─ Error handling                                          │
│  └─ Output generation                                       │
│                    │                                         │
│                    ▼                                         │
│  Activity Logging                                           │
│  ├─ Log solution usage                                      │
│  ├─ Track success/failure                                   │
│  └─ Store for analytics                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 11. **Dashboard**

Central monitoring and analytics hub:

#### Features
- ✅ **Task Overview Cards**
  - Total tasks count
  - In Progress tasks
  - Completed tasks
  - Overdue tasks
- ✅ **Visual Analytics**
  - Task status pie chart
  - Priority distribution bar chart
  - Task creation timeline
- ✅ **Recent Activity Feed**
  - Last 10 activities
  - Color-coded by action type
  - User avatars and timestamps
- ✅ **Quick Actions**
  - Create new task
  - View all projects
  - Access reports
- ✅ **Role-Based Views**
  - Admin: See all workspace tasks
  - Employee: See assigned tasks only

#### Dashboard Flow
```
┌─────────────────────────────────────────────────────────────┐
│                        DASHBOARD FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User Logs In                                                │
│  └─ Redirects to /dashboard                                 │
│                    │                                         │
│                    ▼                                         │
│  Load Dashboard Data (Parallel Queries)                     │
│  ├─ GET /api/tasks (filtered by role)                      │
│  ├─ GET /api/projects                                       │
│  ├─ GET /api/members                                        │
│  └─ GET /api/activity (recent 10)                          │
│                    │                                         │
│                    ▼                                         │
│  Calculate Metrics                                          │
│  ├─ Count total tasks                                       │
│  ├─ Count by status (To Do, In Progress, Done)            │
│  ├─ Count by priority (Low, Medium, High, Critical)       │
│  ├─ Identify overdue tasks                                 │
│  └─ Calculate completion percentage                         │
│                    │                                         │
│                    ▼                                         │
│  Render Dashboard Components                                │
│  ├─ KPI Cards (4 metric cards at top)                      │
│  ├─ Charts Section                                          │
│  │   ├─ Status Pie Chart (recharts)                        │
│  │   └─ Priority Bar Chart (recharts)                      │
│  ├─ Recent Activity Timeline                                │
│  │   ├─ Activity items with icons                          │
│  │   ├─ User avatars                                        │
│  │   └─ Relative timestamps                                │
│  └─ Quick Action Buttons                                    │
│                    │                                         │
│                    ▼                                         │
│  Auto-Refresh (Optional)                                    │
│  └─ TanStack Query refetchInterval: 30s                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 12. **Summary Page**

Project overview and requirements hub:

#### Features
- ✅ **Projects Grid**
  - All projects displayed as cards
  - Project images/avatars
  - Team member count
  - Creation date
  - Click to view project tasks
- ✅ **Requirements Section** (Admin only)
  - All requirements displayed
  - Status badges (Approved, Rejected, Pending)
  - Customer and PM info
  - File count indicators
  - Click for detailed view
- ✅ **Quick Actions**
  - Create new project
  - Add requirement (admin)

#### Summary Page Flow
```
┌─────────────────────────────────────────────────────────────┐
│                       SUMMARY PAGE FLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User Navigates to /summary                                  │
│                    │                                         │
│                    ▼                                         │
│  Load Data (Parallel Queries)                               │
│  ├─ GET /api/projects                                       │
│  └─ GET /api/requirements (if admin)                        │
│                    │                                         │
│                    ▼                                         │
│  Display Projects Section                                   │
│  ├─ Project cards in grid (1-3 columns)                    │
│  ├─ Each card shows:                                        │
│  │   ├─ Project image/avatar                               │
│  │   ├─ Project name                                        │
│  │   ├─ Team size                                           │
│  │   └─ Created date                                        │
│  └─ Click card → Navigate to /tasks?projectId=xxx          │
│                    │                                         │
│                    ▼                                         │
│  Display Requirements Section (Admin Only)                  │
│  ├─ Requirements cards in grid                              │
│  ├─ Each card shows:                                        │
│  │   ├─ Title                                               │
│  │   ├─ Customer name                                       │
│  │   ├─ Project manager                                     │
│  │   ├─ Status badge                                        │
│  │   ├─ File counts                                         │
│  │   └─ Due date                                            │
│  └─ Click card → Open RequirementDetailsModal              │
│                    │                                         │
│                    ▼                                         │
│  Quick Actions                                              │
│  ├─ "New Project" button → Opens CreateProjectModal        │
│  └─ "Add Requirement" button → Navigate to /add-requirements│
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Module Documentation

### Feature Structure
Each of the 14 features follows a consistent architecture:

```
src/features/{feature-name}/
├── api/                    # React Query hooks
│   ├── use-get-*.ts       # GET queries
│   ├── use-create-*.ts    # POST mutations
│   ├── use-update-*.ts    # PATCH mutations
│   └── use-delete-*.ts    # DELETE mutations
├── components/             # React components
│   ├── *-form.tsx         # Form components
│   ├── *-modal.tsx        # Modal wrappers│   ├── *-card.tsx         # Card components
│   └── *-list.tsx         # List/table components
├── server/                 # Backend API routes
│   └── route.ts           # Hono.js routes
├── schemas.ts             # Zod validation schemas
├── types.ts               # TypeScript types
└── hooks/ (optional)      # Custom React hooks
```

### Module List

1. **activity** - Activity logging system
2. **attendance** - Time/shift tracking
3. **auth** - Authentication & sessions
4. **bugs** - Bug tracking system
5. **invitations** - User invite management
6. **members** - Team member management
7. **notifications** - Alert system
8. **profiles** - User profiles with photos
9. **projects** - Project management
10. **requirements** - Requirements tracking
11. **task-overviews** - Task summaries
12. **tasks** - Kanban task boards
13. **weekly-reports** - Weekly reporting
14. **workspaces** - Multi-tenant workspaces

---

## 🗄️ Database Schema

### Core Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

#### workspaces
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  invite_code TEXT UNIQUE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

#### members
```sql
CREATE TABLE members (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MEMBER')),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(user_id, workspace_id)
);
```

#### projects
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

#### tasks
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  position INTEGER NOT NULL,
  priority TEXT,
  due_date TIMESTAMP,
  assignee_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Performance index
CREATE INDEX idx_tasks_workspace_status_position 
ON tasks(workspace_id, status, position);
```

#### bugs (Complete Schema)
```sql
CREATE TABLE bugs (
  id UUID PRIMARY KEY,
  bug_id TEXT UNIQUE NOT NULL,
  assigned_to UUID NOT NULL REFERENCES users(id),
  bug_type TEXT NOT NULL,
  bug_description TEXT NOT NULL,
  file_url TEXT,
  output_file_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('OPEN', 'IN PROGRESS', 'RESOLVED', 'CLOSED')),
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  reported_by UUID NOT NULL REFERENCES users(id),
  reported_by_name TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE bug_comments (
  id UUID PRIMARY KEY,
  bug_id UUID NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  file_url TEXT,
  is_system_comment BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL
);
```

#### attendance
```sql
CREATE TABLE attendance (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  workspace_id UUID REFERENCES workspaces(id),
  project_id UUID REFERENCES projects(id),
  shift_start_time TIMESTAMP NOT NULL,
  shift_end_time TIMESTAMP,
  total_duration INTEGER,  -- in minutes
  end_activity TEXT,
  daily_tasks JSONB,       -- array of strings
  status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Optimized indexes
CREATE INDEX attendance_user_idx ON attendance(user_id);
CREATE INDEX attendance_date_idx ON attendance(shift_start_time);
CREATE INDEX attendance_user_date_idx ON attendance(user_id, shift_start_time);
```

#### activity_logs
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  workspace_id UUID REFERENCES workspaces(id),
  project_id UUID REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),
  changes JSONB,           -- { field, oldValue, newValue }
  summary TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);

-- 8 optimized indexes for fast queries
CREATE INDEX activity_logs_workspace_created_idx ON activity_logs(workspace_id, created_at DESC);
CREATE INDEX activity_logs_task_idx ON activity_logs(task_id);
CREATE INDEX activity_logs_action_type_idx ON activity_logs(action_type);
-- ... 5 more indexes
```

---

## 🔌 API Reference

### Authentication
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/register
GET    /api/auth/current
```

### Workspaces
```
GET    /api/workspaces
POST   /api/workspaces
PATCH  /api/workspaces/:id
DELETE /api/workspaces/:id
POST   /api/workspaces/:id/join
```

### Tasks
```
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/bulk-update    # For drag-and-drop
```

### Bugs
```
GET    /api/bugs/assigned
GET    /api/bugs/reported
GET    /api/bugs/:bugId
POST   /api/bugs
PATCH  /api/bugs/:bugId
GET    /api/bugs/:bugId/comments
POST   /api/bugs/:bugId/comments
GET    /api/bugs/types
POST   /api/bugs/types
```

### Attendance
```
GET    /api/attendance/my-attendance
GET    /api/attendance/records        # Admin only
POST   /api/attendance/start-shift
POST   /api/attendance/end-shift
```

### Activity Logs
```
GET    /api/activity?workspaceId=xxx&limit=50
GET    /api/activity/task/:taskId
```

### Notifications
```
GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/mark-all-read
```

---

## 🎨 UI/UX Guidelines

### Jira-Style Input Components

#### Dark Mode Inputs
```css
/* Already in globals.css */
.jira-input {
  background-color: #1D1F24;
  border: 1px solid #2C2F34;
  color: #EBECF0;
  border-radius: 6px;
  padding: 8px 12px;
}

.jira-input:focus {
  border-color: #579DFF;
  box-shadow: 0 0 0 3px rgba(87, 157, 255, 0.25);
}
```

#### Usage
```tsx
import { JiraInput } from "@/components/ui/jira-input";

<JiraInput
  type="text"
  placeholder="Enter task name..."
/>
```

### Color Palette
```typescript
// Priority Colors
LOW:      Green (#22C55E)
MEDIUM:   Yellow (#EAB308)
HIGH:     Orange (#F97316)
CRITICAL: Red (#EF4444)

// Status Colors
OPEN:        Red (#EF4444)
IN_PROGRESS: Blue (#3B82F6)
RESOLVED:    Purple (#A855F7)
CLOSED:      Gray (#6B7280)

// UI Colors
Background:  #1D1F24
Border:      #2C2F34
Focus:       #579DFF
Text:        #EBECF0
Placeholder: #8A9099
```

### Responsive Breakpoints
```typescript
sm:  640px   // Mobile landscape
md:  768px   // Tablet
lg:  1024px  // Desktop
xl:  1280px  // Large desktop
2xl: 1536px  // Extra large
```

---

## 🚀 Performance Best Practices

### 1. Database Query Optimization
```typescript
// ❌ Bad: N+1 queries
const tasks = await db.select().from(tasks);
for (const task of tasks) {
  const user = await db.select().from(users).where(eq(users.id, task.assigneeId));
}

// ✅ Good: Single JOIN query
const tasks = await db
  .select()
  .from(tasks)
  .leftJoin(users, eq(tasks.assigneeId, users.id));
```

### 2. React Component Optimization
```typescript
// ✅ Use React.memo for expensive components
export const KanbanCard = memo(KanbanCardComponent, (prev, next) => {
  return prev.task.id === next.task.id &&
         prev.task.status === next.task.status;
});
```

### 3. Pagination Pattern
```typescript
// ✅ Per-column pagination
const INITIAL_TASKS = 50;
const [visibleCount, setVisibleCount] = useState(INITIAL_TASKS);

const visibleTasks = tasks.slice(0, visibleCount);
const hasMore = tasks.length > visibleCount;
```

### 4. CSS GPU Acceleration
```css
/* ✅ Hardware acceleration for smooth animations */
.dragging-element {
  transform: translateZ(0);
  will-change: transform;
  contain: layout style paint;
}
```

---

## 📊 Performance Benchmarks

### Kanban Board (1,276 tasks)
```
Initial Load:    <1s (vs 8-10s before)
DOM Elements:    250 (vs 1,276 before)
Memory Usage:    50MB (vs 200MB before)
Drag Response:   <50ms (vs 2-3s before)
Scroll FPS:      60 (vs 20-30 before)
Max Users:       1,000+ (vs 100 before)
```

### Database Queries
```
Activity Logs (1,000 records):  ~100-150ms
Tasks Query (1,276 tasks):      ~435ms
Attendance Records (500):       ~50-80ms
Bug List (100 bugs):            ~30-50ms
```

---

## 🔐 Security Features

- ✅ **Session-based authentication** with secure cookies
- ✅ **Role-based access control** (ADMIN/MEMBER)
- ✅ **Workspace isolation** (multi-tenant)
- ✅ **SQL injection prevention** (Drizzle ORM)
- ✅ **XSS protection** (React auto-escaping)
- ✅ **CSRF protection** (session tokens)
- ✅ **Password hashing** (bcrypt)
- ✅ **Input validation** (Zod schemas)

---

## 🧪 Testing Checklist

### Feature Testing
- ✅ Database migrations applied
- ✅ API endpoints functional
- ✅ UI components render correctly
- ✅ Forms validate properly
- ✅ Notifications deliver
- ✅ Permissions enforce correctly
- ✅ File uploads/downloads work
- ✅ Responsive design verified

### Performance Testing
- ✅ Load testing with 1,000+ users
- ✅ Memory profiling
- ✅ Database query optimization
- ✅ Frontend rendering performance
- ✅ Network payload size

---

## 🛠️ Development Setup

### Prerequisites
```bash
Node.js 18+
Bun (package manager)
PostgreSQL 14+
```

### Installation
```bash
# Clone repository
git clone https://github.com/karan-moorthy/Management-system.git
cd PMS1

# Install dependencies
bun install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials

# Run migrations
bun run db:migrate

# Start development server
bun run dev
```

### Environment Variables
```env
DATABASE_URL=postgresql://user:password@localhost:5432/pms1
SESSION_SECRET=your-secret-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📝 Changelog

### Version 2.0 (Current)
- ✅ Bug tracker with conversation system
- ✅ Jira-style activity logging (15+ types)
- ✅ Kanban performance optimizations
- ✅ Attendance management enhancements
- ✅ Notification system improvements
- ✅ Responsive design across all features

### Version 1.0
- ✅ Initial release
- ✅ Task management (Kanban)
- ✅ Project management
- ✅ User authentication
- ✅ Workspace management
- ✅ Basic notifications

---

## 🎯 Roadmap

### Planned Features
- [ ] Email notifications
- [ ] Real-time collaboration (WebSockets)
- [ ] Advanced analytics dashboard
- [ ] Time tracking integration
- [ ] Git integration
- [ ] Mobile apps (iOS/Android)
- [ ] API webhooks
- [ ] Custom fields
- [ ] Gantt charts
- [ ] Resource management

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👥 Support

For questions or issues:
- GitHub Issues: [Create an issue](https://github.com/karan-moorthy/Management-system/issues)
- Email: support@pms1.com
- Documentation: [Full Docs](https://docs.pms1.com)

---

## 🎉 Acknowledgments

Built with:
- Next.js Team
- Radix UI Team
- TanStack Query Team
- Drizzle ORM Team
- All open-source contributors

---

**Last Updated:** December 5, 2025  
**Version:** 2.0.0  
**Status:** Production Ready ✅
