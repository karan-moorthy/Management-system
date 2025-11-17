const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { users, sessions, members, tasks, attendance } = require('./src/db/schema.ts');
const { eq, or } = require('drizzle-orm');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

// List of employee emails to delete
const employeeEmails = [
  'aakash.parashar@pms.com',
  'aishwarya.jeevan@pms.com',
  'arunraj@pms.com',
  'chandramohan.reddy@pms.com',
  'karthikeyan.saminathan@pms.com',
  'rajkumar.patil@pms.com',
  'sathish.kumar@pms.com',
  'vinoth.shanmugam@pms.com',
  'francis.xavier@pms.com',
  'arumugam.siva@pms.com',
  'jayasurya.sudhakaran@pms.com',
  'balumohan@pms.com',
];

async function deleteEmployees() {
  try {
    console.log('\n🗑️  Deleting employees and their related data...\n');

    let deletedCount = 0;

    for (const email of employeeEmails) {
      try {
        // Find user
        const [user] = await db.select().from(users).where(eq(users.email, email));

        if (!user) {
          console.log(`⚠️  Not found: ${email}`);
          continue;
        }

        console.log(`\nDeleting: ${user.name} (${email})`);

        // Delete related data
        // 1. Sessions
        const deletedSessions = await db.delete(sessions).where(eq(sessions.userId, user.id)).returning();
        console.log(`  - Deleted ${deletedSessions.length} sessions`);

        // 2. Members
        const deletedMembers = await db.delete(members).where(eq(members.userId, user.id)).returning();
        console.log(`  - Deleted ${deletedMembers.length} member records`);

        // 3. Attendance
        try {
          const deletedAttendance = await db.delete(attendance).where(eq(attendance.userId, user.id)).returning();
          console.log(`  - Deleted ${deletedAttendance.length} attendance records`);
        } catch (e) {
          console.log(`  - No attendance records`);
        }

        // 4. Tasks (as assignee)
        try {
          const deletedTasks = await db.delete(tasks).where(eq(tasks.assigneeId, user.id)).returning();
          console.log(`  - Deleted ${deletedTasks.length} tasks`);
        } catch (e) {
          console.log(`  - No tasks`);
        }

        // 5. Delete user
        await db.delete(users).where(eq(users.id, user.id));
        console.log(`  ✅ Deleted user`);

        deletedCount++;
      } catch (error) {
        console.error(`  ❌ Error deleting ${email}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} employees!`);

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

// Confirmation check
const confirmArg = process.argv[2];

if (confirmArg !== 'CONFIRM') {
  console.error('\n⚠️  This will delete all specified employees and their related data!');
  console.error('\nEmployees to be deleted:');
  employeeEmails.forEach((email, index) => {
    console.error(`  ${index + 1}. ${email}`);
  });
  console.error('\nTo confirm, run:');
  console.error('node -r esbuild-register delete-employees.js CONFIRM');
  process.exit(1);
}

deleteEmployees();
