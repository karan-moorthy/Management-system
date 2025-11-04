const postgres = require('postgres');
require('dotenv/config');

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'pmsdb',
  username: 'postgres',
  password: 'admin'
});

async function testTaskEditAPI() {
  try {
    console.log('🔍 Testing task edit via API simulation...');
    
    // Get a task to test with
    const tasks = await sql`
      SELECT id, name, status, priority, assignee_id, project_id, workspace_id 
      FROM tasks 
      LIMIT 1
    `;
    
    if (tasks.length === 0) {
      console.log('❌ No tasks found in database');
      return;
    }
    
    const task = tasks[0];
    console.log('📋 Testing with task:', {
      id: task.id,
      name: task.name,
      status: task.status
    });
    
    // Simulate what the PATCH request should do
    const updatedTask = await sql`
      UPDATE tasks 
      SET name = ${task.name + ' - EDITED VIA API TEST'}, 
          description = 'Test edit from API simulation',
          updated_at = NOW()
      WHERE id = ${task.id}
      RETURNING id, name, description, status, updated_at
    `;
    
    console.log('✅ Task edit simulation successful:', {
      id: updatedTask[0].id,
      name: updatedTask[0].name,
      description: updatedTask[0].description,
      updated: updatedTask[0].updated_at
    });
    
    console.log('\n💡 This confirms the database edit functionality works.');
    console.log('💡 The issue is likely in the frontend form submission.');
    
  } catch (error) {
    console.error('❌ Error in task edit simulation:', error.message);
  } finally {
    await sql.end();
  }
}

testTaskEditAPI();