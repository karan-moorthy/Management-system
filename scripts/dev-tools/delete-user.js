const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { users, sessions, members, workspaces, projects, tasks, attendance } = require('./src/db/schema.ts');
const { eq } = require('drizzle-orm');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function deleteUser(email) {
  try {
    console.log(`\nDeleting user with email: ${email}`);

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      console.log('❌ User not found');
      await client.end();
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.id})`);

    // Delete in correct order due to foreign keys
    console.log('\n🗑️  Deleting related data...');

    // 1. Delete sessions (will auto-cascade due to onDelete: 'cascade')
    const deletedSessions = await db.delete(sessions).where(eq(sessions.userId, user.id)).returning();
    console.log(`✅ Deleted ${deletedSessions.length} sessions`);

    // 2. Delete members
    const deletedMembers = await db.delete(members).where(eq(members.userId, user.id)).returning();
    console.log(`✅ Deleted ${deletedMembers.length} member records`);

    // 3. Delete attendance records
    try {
      const deletedAttendance = await db.delete(attendance).where(eq(attendance.userId, user.id)).returning();
      console.log(`✅ Deleted ${deletedAttendance.length} attendance records`);
    } catch (e) {
      console.log('⚠️  No attendance records or table not exists');
    }

    // 4. Delete tasks assigned to user (if exists)
    try {
      const deletedTasks = await db.delete(tasks).where(eq(tasks.assigneeId, user.id)).returning();
      console.log(`✅ Deleted ${deletedTasks.length} tasks`);
    } catch (e) {
      console.log('⚠️  No tasks or table not exists');
    }

    // 5. Delete workspaces owned by user (will cascade to projects and tasks)
    const deletedWorkspaces = await db.delete(workspaces).where(eq(workspaces.userId, user.id)).returning();
    console.log(`✅ Deleted ${deletedWorkspaces.length} workspaces`);

    // 6. Finally delete the user
    const [deletedUser] = await db.delete(users).where(eq(users.id, user.id)).returning();
    console.log(`\n✅ Successfully deleted user: ${deletedUser.name} (${deletedUser.email})`);

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error deleting user:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('Usage: node delete-user.js <email>');
  console.error('Example: node delete-user.js user@example.com');
  process.exit(1);
}

deleteUser(email);
