<div align="center">

<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/karan4533/Proj_Pms">
    <img src="public/logo.svg" alt="Logo" width="80" height="80">
  </a>

  <h1 align="center">📊 Proj_Pms - Enterprise Project Management System</h1>

  <p align="center">
    A modern, full-featured project management platform built with Next.js, TypeScript, and PostgreSQL
    <br />
    <a href="./docs/COMPREHENSIVE_SYSTEM_GUIDE.md"><strong>📚 Explore the Documentation »</strong></a>
    <br />
    <br />
    <a href="https://github.com/karan4533/Proj_Pms/issues">Report Bug</a>
    ·
    <a href="https://github.com/karan4533/Proj_Pms/issues">Request Feature</a>
  </p>
</p>

<!-- TECH STACK BADGES -->
<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS">
  <img src="https://img.shields.io/badge/Drizzle-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM">
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/karan4533/Proj_Pms?style=flat-square" alt="License">
  <img src="https://img.shields.io/github/stars/karan4533/Proj_Pms?style=flat-square" alt="Stars">
  <img src="https://img.shields.io/github/issues/karan4533/Proj_Pms?style=flat-square" alt="Issues">
</p>

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Highlights](#-key-highlights)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Database Schema](#️-database-schema)
- [API Documentation](#-api-documentation)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📋 Overview

**Proj_Pms** is a comprehensive, enterprise-grade project management system designed to rival platforms like Jira and Monday. com. Built with modern web technologies, it provides organizations with powerful tools for: 

- **Project & Task Management** – Organize work with Kanban boards and hierarchical tasks
- **Team Collaboration** – Multi-workspace architecture with role-based access
- **Bug Tracking** – Complete bug lifecycle management with severity levels
- **Attendance Tracking** – Employee shift management with automated logging
- **Analytics & Reporting** – Visual dashboards and weekly reports

<p align="right">(<a href="#-table-of-contents">⬆️ back to top</a>)</p>

---

## 🎯 Key Highlights

| Feature | Description |
|---------|-------------|
| ✅ **Multi-Workspace** | Role-based access control (RBAC) with team isolation |
| ✅ **Kanban Boards** | Drag-and-drop task management interface |
| ✅ **Bug Tracking** | Full lifecycle management with severity levels |
| ✅ **Attendance System** | Automated shift tracking with cron jobs |
| ✅ **Real-time Notifications** | Activity logging and instant updates |
| ✅ **Custom Fields** | Jira-style flexible task attributes (JSONB) |
| ✅ **Bulk Import/Export** | CSV support for 1,000+ rows |
| ✅ **Weekly Reports** | Requirement tracking and progress reports |
| ✅ **High Performance** | Optimized for 1,000+ concurrent users |

<p align="right">(<a href="#-table-of-contents">⬆️ back to top</a>)</p>

---

## ✨ Features

### 🔐 Authentication & Authorization
- Secure authentication with **bcrypt** password hashing
- Role-based access control:  `ADMIN`, `PROJECT_MANAGER`, `TEAM_LEAD`, `EMPLOYEE`, `MANAGEMENT`
- Session management with automatic token refresh
- Workspace invitations with email-based onboarding

### 📊 Project & Task Management
- Multi-project workspaces with team isolation
- **Kanban boards** with drag-and-drop functionality
- Task hierarchy with parent-child relationships
- Dynamic custom fields (JSONB-based)
- Bulk CSV import/export (1,000+ rows)
- Advanced filtering and task priorities

### 🐛 Bug Tracking
- Comprehensive bug tracker with severity levels
- Bug lifecycle management (Open → In Progress → Resolved → Closed)
- File attachments and comments support
- Resolution tracking and metrics

### ⏰ Attendance Management
- Clock in/out system with shift tracking
- Auto end-shift at 11: 59 PM (cron automation)
- Daily task logging during shifts
- Admin attendance dashboard with reports

### 📈 Reporting & Analytics
- Dashboard with task statistics and KPIs
- Visual charts (pie, bar) for status distribution
- Activity timeline (Jira-style audit logs)
- Weekly reports and requirements tracking

<p align="right">(<a href="#-table-of-contents">⬆️ back to top</a>)</p>

---

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top" width="50%">

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org/) | 14.2 | React framework with App Router |
| [React](https://react.dev/) | 18 | UI library with Server Components |
| [TypeScript](https://www.typescriptlang.org/) | 5 | Type-safe JavaScript |
| [Tailwind CSS](https://tailwindcss.com/) | 3.4 | Utility-first CSS |
| [shadcn/ui](https://ui.shadcn.com/) | Latest | Component library |
| [TanStack Query](https://tanstack.com/query) | 5 | Data fetching & caching |
| [React Hook Form](https://react-hook-form. com/) | Latest | Form management |
| [Zod](https://zod.dev/) | Latest | Schema validation |

</td>
<td valign="top" width="50%">

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| [Hono](https://hono.dev/) | Latest | Web framework (RPC API) |
| [PostgreSQL](https://www.postgresql.org/) | 16 | Relational database |
| [Drizzle ORM](https://orm.drizzle.team/) | 0.44 | Type-safe ORM |
| [bcryptjs](https://github.com/dcodeIO/bcrypt. js) | Latest | Password hashing |

</td>
</tr>
</table>

<p align="right">(<a href="#-table-of-contents">⬆️ back to top</a>)</p>

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed: 

| Requirement | Version | Download |
|-------------|---------|----------|
| Node.js | 18.x or higher | [nodejs.org](https://nodejs.org/) |
| PostgreSQL | 16.x or higher | [postgresql.org](https://www.postgresql.org/download/) |
| npm / yarn / bun | Latest | Comes with Node.js |
| Git | Latest | [git-scm.com](https://git-scm.com/) |

<p align="right">(<a href="#-table-of-contents">⬆️ back to top</a>)</p>

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/karan4533/Proj_Pms.git
cd Proj_Pms
```

### 2️⃣ Install Dependencies

```bash
npm install
# or
yarn install
# or
bun install
```

### 3️⃣ Environment Setup

Create a `.env.local` file in the root directory: 

```env
# Database (Required)
DATABASE_URL="postgresql://username:password@localhost:5432/proj_pms_db"

# Authentication (Required)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here"

# Application (Required)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

### 4️⃣ Database Setup

```bash
# Generate database schema
npm run db:generate

# Run migrations
npm run db: migrate

# (Optional) Push schema directly
npm run db: push
```

### 5️⃣ Run the Development Server

```bash
npm run dev
```

🎉 Open [http://localhost:3000](http://localhost:3000) in your browser! 

---

### 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate database migrations |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |

<p align="right">(<a href="#-table-of-contents">⬆️ back to top</a>)</p>

---

## 📁 Project Structure

```
Proj_Pms/
├── 📂 src/
│   ├── 📂 app/                    # Next.js App Router
│   │   ├── 📂 (auth)/             # Authentication routes
│   │   ├── 📂 (dashboard)/        # Dashboard routes
│   │   │   ├── 📂 attendance/     # Attendance management
│   │   │   ├── 📂 bugs/           # Bug tracker
│   │   │   ├── 📂 dashboard/      # Main dashboard
│   │   │   ├── 📂 projects/       # Project management
│   │   │   ├── 📂 tasks/          # Task management
│   │   │   └── 📂 workspaces/     # Workspace management
│   │   └── 📂 api/                # API routes (Hono RPC)
│   ├── 📂 components/             # React components
│   │   └── 📂 ui/                 # shadcn/ui components
│   ├── 📂 db/                     # Database configuration
│   │   ├── 📄 schema.ts           # Drizzle schema definitions
│   │   └── 📄 index.ts            # Database connection
│   ├── 📂 features/               # Feature modules
│   │   ├── 📂 auth/               # Authentication logic
│   │   ├── 📂 tasks/              # Task management
│   │   ├── 📂 bugs/               # Bug tracking
│   │   ├── 📂 attendance/         # Attendance system
│   │   ├── 📂 projects/           # Project features
│   │   └── 📂 workspaces/         # Workspace features
│   └── 📂 lib/                    # Utility functions
├── 📂 drizzle/                    # Database migrations
├── 📂 docs/                       # Documentation
├── 📂 public/                     # Static assets
├── 📂 scripts/                    # Utility scripts
├── 📄 package.json
├── 📄 tsconfig.json
└── 📄 tailwind.config. ts
```

<p align="right">(<a href="#-table-of-contents">⬆️ back to top</a>)</p>

---

## 🗄️ Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | User accounts with authentication & profiles |
| `workspaces` | Multi-tenant workspaces with invite codes |
| `members` | User-workspace relationships (RBAC) |
| `projects` | Projects within workspaces |
| `tasks` | Task management with custom fields (JSONB) |
| `bugs` | Bug tracking with severity levels |
| `attendance` | Attendance records with shift tracking |
| `activity_logs` | Audit trail for all system changes |
| `notifications` | User notifications |
| `weekly_reports` | Weekly report submissions |
| `requirements` | Project requirements |
| `invitations` | Workspace invitations |

### Key Database Features

- ✅ **Foreign key constraints** for data integrity
- ✅ **Indexed columns** for optimized queries
- ✅ **JSONB fields** for flexible custom data
- ✅ **Cascading deletes** for automatic cleanup
- ✅ **Timestamps** for complete audit trails

> 📖 See [Database Structure Documentation](./docs/DATABASE_STRUCTURE.md) for complete schema details. 

<p align="right">(<a href="#-table-of-contents">⬆️ back to top</a>)</p>

---

## 📡 API Documentation

The API is built using **Hono RPC** for type-safe client-server communication. 

### Base URL
```
http://localhost:3000/api
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | User authentication |
| `GET` | `/api/workspaces` | List user workspaces |
| `GET` | `/api/projects` | List workspace projects |
| `GET` | `/api/tasks` | List project tasks |
| `GET` | `/api/bugs` | List project bugs |
| `GET` | `/api/attendance` | Get attendance records |

<p align="right">(<a href="#-table-of-contents">⬆️ back to top</a>)</p>

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [📚 Comprehensive System Guide](./docs/COMPREHENSIVE_SYSTEM_GUIDE. md) | Complete system overview |
| [🗄️ Database Structure](./docs/DATABASE_STRUCTURE.md) | Database schema details |
| [🔧 Custom Fields Guide](./docs/CUSTOM_FIELDS_GUIDE.md) | Dynamic field configuration |
| [⏰ Auto End-Shift & Performance](./docs/AUTO_END_SHIFT_AND_PERFORMANCE.md) | Cron jobs & optimization |

<p align="right">(<a href="#-table-of-contents">⬆️ back to top</a>)</p>

---

## 🤝 Contributing

Contributions are what make the open source community amazing! Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#-table-of-contents">⬆️ back to top</a>)</p>

---

**Built with ❤️ by [Karan](https://github.com/karan4533)**

<p align="right">
  <a href="#-table-of-contents">⬆️ Back to Top</a>
</p>

</div>