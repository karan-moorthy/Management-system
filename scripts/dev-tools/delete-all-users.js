const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { users, sessions, members, workspaces, projects, tasks, attendance } = require('./src/db/schema.ts');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function deleteAllUsers() {
  try {
    console.log('\n⚠️  WARNING: This will delete ALL users and ALL related data!');
    console.log('This includes: sessions, members, workspaces, projects, tasks, attendance\n');

    // Delete all data in correct order
    console.log('🗑️  Deleting all data...\n');

    // 1. Delete attendance
    try {
      const deletedAttendance = await db.delete(attendance).returning();
      console.log(`✅ Deleted ${deletedAttendance.length} attendance records`);
    } catch (e) {
      console.log('⚠️  No attendance table or already empty');
    }

    // 2. Delete tasks
    try {
      const deletedTasks = await db.delete(tasks).returning();
      console.log(`✅ Deleted ${deletedTasks.length} tasks`);
    } catch (e) {
      console.log('⚠️  No tasks table or already empty');
    }

    // 3. Delete projects
    const deletedProjects = await db.delete(projects).returning();
    console.log(`✅ Deleted ${deletedProjects.length} projects`);

    // 4. Delete workspaces
    const deletedWorkspaces = await db.delete(workspaces).returning();
    console.log(`✅ Deleted ${deletedWorkspaces.length} workspaces`);

    // 5. Delete members
    const deletedMembers = await db.delete(members).returning();
    console.log(`✅ Deleted ${deletedMembers.length} member records`);

    // 6. Delete sessions
    const deletedSessions = await db.delete(sessions).returning();
    console.log(`✅ Deleted ${deletedSessions.length} sessions`);

    // 7. Delete all users
    const deletedUsers = await db.delete(users).returning();
    console.log(`✅ Deleted ${deletedUsers.length} users`);

    console.log('\n✅ Successfully deleted all users and related data!');
    console.log('\n📋 Deleted users:');
    deletedUsers.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
    });

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error deleting data:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

// Confirmation check
const confirmArg = process.argv[2];

if (confirmArg !== 'CONFIRM') {
  console.error('\n⚠️  DANGER: This will delete ALL users and ALL data!');
  console.error('\nTo confirm, run:');
  console.error('node -r esbuild-register delete-all-users.js CONFIRM');
  process.exit(1);
}

deleteAllUsers();
