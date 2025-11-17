const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { eq, and, desc } = require('drizzle-orm');

// Import schema
const schema = require('./src/db/schema.ts');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function testAttendance() {
  try {
    console.log('Testing attendance queries...\n');

    // Test 1: Get all attendance records
    console.log('1. Testing all attendance records:');
    const allRecords = await db.query.attendance.findMany({
      limit: 5,
    });
    console.log(`Found ${allRecords.length} records`);
    console.log(JSON.stringify(allRecords, null, 2));
    console.log('\n');

    // Test 2: Get attendance with user join
    console.log('2. Testing attendance with user join:');
    const { attendance, users } = schema;
    
    const recordsWithUser = await db
      .select({
        id: attendance.id,
        userId: attendance.userId,
        userName: users.name,
        userEmail: users.email,
        projectId: attendance.projectId,
        shiftStartTime: attendance.shiftStartTime,
        shiftEndTime: attendance.shiftEndTime,
        totalDuration: attendance.totalDuration,
        endActivity: attendance.endActivity,
        dailyTasks: attendance.dailyTasks,
        status: attendance.status,
      })
      .from(attendance)
      .innerJoin(users, eq(attendance.userId, users.id))
      .limit(5);
    
    console.log(`Found ${recordsWithUser.length} records with user info`);
    console.log(JSON.stringify(recordsWithUser, null, 2));
    console.log('\n');

    // Test 3: Count attendance by status
    console.log('3. Testing count by status:');
    const inProgress = await db.query.attendance.findMany({
      where: eq(attendance.status, 'IN_PROGRESS'),
    });
    const completed = await db.query.attendance.findMany({
      where: eq(attendance.status, 'COMPLETED'),
    });
    console.log(`IN_PROGRESS: ${inProgress.length}`);
    console.log(`COMPLETED: ${completed.length}`);
    console.log('\n');

  } catch (error) {
    console.error('Error testing attendance:', error);
  } finally {
    await pool.end();
  }
}

testAttendance();
