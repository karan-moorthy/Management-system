<div align="center">

<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/karan-moorthy/PMS1">
    <img src="public/logo.svg" alt="Logo" width="80" height="80">
  </a>

  <h1 align="center">PMS1 - Enterprise Project Management System</h1>

  <p align="center">
    A modern, full-featured project management platform built with Next.js, TypeScript, and PostgreSQL
    <br />
    <a href="./docs/COMPREHENSIVE_SYSTEM_GUIDE.md"><strong>Explore the docs </strong></a>
  </p>
</p>

<!-- TECH STACK BADGES -->
<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS">
</p>

</div>

---

<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary><h2 style="display: inline-block"> Table of Contents</h2></summary>
  <ol>
    <li><a href="#-overview">Overview</a></li>
    <li><a href="#-key-highlights">Key Highlights</a></li>
    <li><a href="#-features">Features</a></li>
    <li><a href="#-tech-stack">Tech Stack</a></li>
    <li><a href="#-prerequisites">Prerequisites</a></li>
    <li><a href="#-getting-started">Getting Started</a></li>
    <li><a href="#-project-structure">Project Structure</a></li>
    <li><a href="#%EF%B8%8F-database-schema">Database Schema</a></li>
  </ol>
</details>

---

##  Overview

**PMS1** is a comprehensive, enterprise-grade project management system designed to rival platforms like Jira and Monday.com. Built with modern web technologies, it provides organizations with powerful tools for task management, team collaboration, attendance tracking, and project oversight.

<p align="right">(<a href="#top">back to top</a>)</p>

---

##  Key Highlights

-  **Multi-workspace architecture** with role-based access control (RBAC)
-  **Kanban boards** with drag-and-drop task management
-  **Bug tracking system** with full lifecycle management
-  **Attendance management** with automated shift tracking
-  **Real-time notifications** and activity logging
-  **Dynamic custom fields** (Jira-style flexible task attributes)
-  **Bulk CSV import/export** for tasks and data
-  **Weekly reports** and requirement tracking
-  **Performance optimized** for 1,000+ concurrent users

<p align="right">(<a href="#top">back to top</a>)</p>

---

##  Features

###  Authentication & Authorization
- Secure authentication with bcrypt password hashing
- Role-based access control (RBAC): ADMIN, PROJECT_MANAGER, TEAM_LEAD, EMPLOYEE, MANAGEMENT
- Session management with automatic token refresh
- Workspace invitations with email-based onboarding

###  Project & Task Management
- Multi-project workspaces with team isolation
- Kanban boards with drag-and-drop functionality
- Task hierarchy with parent-child relationships
- Dynamic custom fields (JSONB-based)
- Bulk CSV import/export (1,000+ rows)
- Advanced filtering and task priorities

###  Bug Tracking
- Comprehensive bug tracker with severity levels
- Bug lifecycle management
- Attachments and comments support
- Resolution tracking

###  Attendance Management
- Clock in/out system with shift tracking
- Auto end-shift at 11:59 PM (cron automation)
- Daily task logging during shifts
- Admin attendance dashboard

###  Reporting & Analytics
- Dashboard with task statistics
- Visual charts (pie, bar) for status distribution
- Activity timeline (Jira-style audit logs)
- Weekly reports and requirements tracking

<p align="right">(<a href="#top">back to top</a>)</p>

---

##  Tech Stack

### Frontend
- **[Next.js 14.2](https://nextjs.org/)** - React framework with App Router
- **[React 18](https://react.dev/)** - UI library with Server Components
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS 3.4](https://tailwindcss.com/)** - Utility-first CSS
- **[shadcn/ui](https://ui.shadcn.com/)** - Component library
- **[TanStack Query 5](https://tanstack.com/query)** - Data fetching & caching
- **[React Hook Form](https://react-hook-form.com/)** - Form management
- **[Zod](https://zod.dev/)** - Schema validation

### Backend
- **[Hono](https://hono.dev/)** - Web framework (RPC API)
- **[PostgreSQL 16](https://www.postgresql.org/)** - Database
- **[Drizzle ORM 0.44](https://orm.drizzle.team/)** - Type-safe ORM
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** - Password hashing

<p align="right">(<a href="#top">back to top</a>)</p>

---

##  Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.x or higher
- **PostgreSQL** 16.x or higher
- **npm** or **yarn** or **bun**
- **Git**

<p align="right">(<a href="#top">back to top</a>)</p>

---

##  Getting Started

### 1. Clone the repository
`ash
git clone https://github.com/karan-moorthy/PMS1.git
cd PMS1
`

### 2. Install dependencies
`ash
npm install
`

### 3. Environment Setup

Create a .env.local file in the root directory:

`env
# Database (Required)
DATABASE_URL="postgresql://username:password@localhost:5432/pms1_db"

# Authentication (Required)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Application (Required)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
`

### 4. Database Setup

`ash
# Generate database schema
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Push schema directly
npm run db:push
`

### 5. Run the development server

`ash
npm run dev
`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

`ash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations
npm run db:push          # Push schema to database
npm run db:studio        # Open Drizzle Studio
`

<p align="right">(<a href="#top">back to top</a>)</p>

---

##  Project Structure

`
PMS1/
 src/
    app/                    # Next.js App Router
       (auth)/            # Authentication routes
       (dashboard)/       # Dashboard routes
          attendance/    # Attendance pages
          bugs/          # Bug tracker
          dashboard/     # Main dashboard
          projects/      # Projects
          tasks/         # Tasks
          workspaces/    # Workspaces
       api/               # API routes (Hono RPC)
    components/            # React components
       ui/               # shadcn/ui components
    db/                   # Database config
       schema.ts         # Drizzle schema
       index.ts          # DB connection
    features/             # Feature modules
       auth/             # Authentication
       tasks/            # Task management
       bugs/             # Bug tracking
       attendance/       # Attendance
       projects/         # Projects
       workspaces/       # Workspaces
    lib/                  # Utilities
 drizzle/                  # Database migrations
 docs/                     # Documentation
 public/                   # Static assets
 scripts/                  # Utility scripts
`

<p align="right">(<a href="#top">back to top</a>)</p>

---

##  Database Schema

### Core Tables (19 total)

| Table | Description |
|-------|-------------|
| users | User accounts with authentication & profiles |
| workspaces | Multi-tenant workspaces with invite codes |
| members | User-workspace relationships (RBAC) |
| projects | Projects within workspaces |
| 	asks | Task management with custom fields (JSONB) |
| ugs | Bug tracking with severity levels |
| ttendance | Attendance records with shift tracking |
| ctivity_logs | Audit trail for all system changes |
| 
otifications | User notifications |
| weekly_reports | Weekly report submissions |
| 
equirements | Project requirements |
| invitations | Workspace invitations |

**Key Features:**
- Foreign key constraints for data integrity
- Indexed columns for fast queries
- JSONB fields for flexible data (custom fields)
- Cascading deletes for cleanup
- Timestamps for audit trails

See [Database Structure Documentation](./docs/DATABASE_STRUCTURE.md) for complete schema details.

<p align="right">(<a href="#top">back to top</a>)</p>

---

##  Documentation

- **[Comprehensive System Guide](./docs/COMPREHENSIVE_SYSTEM_GUIDE.md)**
- **[Database Structure](./docs/DATABASE_STRUCTURE.md)**
- **[Custom Fields Guide](./docs/CUSTOM_FIELDS_GUIDE.md)**
- **[Auto End-Shift & Performance](./docs/AUTO_END_SHIFT_AND_PERFORMANCE.md)**

---

##  License

This project is licensed under the **MIT License**.

---

<div align="center">

**Built with  by [Karan Moorthy](https://github.com/karan-moorthy)**

**Next.js  TypeScript  PostgreSQL**

</div>
