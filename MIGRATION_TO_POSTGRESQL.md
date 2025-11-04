# Migration from Appwrite to PostgreSQL

## Current Status
- ✅ PostgreSQL database connection configured in `src/db/index.ts`
- ✅ Database schema defined in `src/db/schema.ts` with Drizzle ORM
- ❌ All API routes still using Appwrite for data operations

## Migration Steps Required

### 1. Database Setup
- [x] Configure PostgreSQL connection
- [x] Define database schema with Drizzle
- [ ] Run migrations to create tables in PostgreSQL
- [ ] Migrate existing data from Appwrite to PostgreSQL (if any)

### 2. Update Session Middleware
- [ ] Update `src/lib/session-middleware.ts` to use PostgreSQL sessions instead of Appwrite

### 3. Update Authentication
- [ ] Update `src/features/auth/server/route.ts` to use PostgreSQL
- [ ] Update `src/features/auth/queries.ts` to use Drizzle ORM

### 4. Update All Feature Routes
Each feature module needs to be migrated from Appwrite to Drizzle ORM:

#### Workspaces
- [ ] `src/features/workspaces/server/route.ts`
- [ ] `src/features/workspaces/queries.ts`

#### Members
- [ ] `src/features/members/server/route.ts`
- [ ] `src/features/members/server/direct-add-route.ts`
- [ ] `src/features/members/utils.ts`

#### Projects
- [ ] `src/features/projects/server/route.ts`

#### Tasks
- [ ] `src/features/tasks/server/route.ts`

#### Invitations
- [ ] `src/features/invitations/server/route.ts`

### 5. Update Type Definitions
- [ ] Remove `node-appwrite` Models from type definitions
- [ ] Create custom type definitions based on Drizzle schema

### 6. Remove Appwrite Dependencies
- [ ] Update `src/lib/appwrite.ts` or remove if not needed
- [ ] Remove Appwrite environment variables from `.env.local`
- [ ] Update `src/config.ts` to remove Appwrite collection IDs

## Quick Start: Run Migrations

First, run the Drizzle migrations to create tables in PostgreSQL:

```bash
npm run db:push
# or
bun run drizzle-kit push
```

## Next Steps

Would you like me to:
1. Run the database migrations to create tables in PostgreSQL
2. Start migrating the API routes from Appwrite to PostgreSQL (starting with authentication)
3. Create a data migration script to move existing data from Appwrite to PostgreSQL
