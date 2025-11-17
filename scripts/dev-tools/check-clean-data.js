const postgres = require('postgres');
require('dotenv/config');

// Direct PostgreSQL connection
const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'pmsdb',
  username: 'postgres',
  password: 'admin'
});

async function checkCleanData() {
  try {
    console.log('📊 Checking current task data...');
    
    // Count total tasks
    const totalCount = await sql`SELECT COUNT(*) as count FROM tasks`;
    console.log(`\n📈 Total tasks: ${totalCount[0].count}`);
    
    // Show all tasks with readable data
    const tasks = await sql`
      SELECT id, name, description, status, priority, created_at
      FROM tasks 
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log('\n📋 Recent tasks:');
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.name || 'Unnamed'}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Priority: ${task.priority}`);
      console.log(`   Description: ${task.description?.substring(0, 50) || 'No description'}${task.description?.length > 50 ? '...' : ''}`);
      console.log(`   Created: ${task.created_at}`);
      console.log('');
    });
    
    // Check task status distribution
    const statusCounts = await sql`
      SELECT status, COUNT(*) as count
      FROM tasks 
      GROUP BY status
      ORDER BY count DESC
    `;
    
    console.log('📊 Tasks by status:');
    statusCounts.forEach(row => {
      console.log(`   ${row.status}: ${row.count} tasks`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkCleanData();