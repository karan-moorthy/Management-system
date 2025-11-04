const postgres = require('postgres');
require('dotenv/config');

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'pmsdb',
  username: 'postgres',
  password: 'admin'
});

async function testTaskEdit() {
  try {
    console.log('🔍 Testing task edit functionality...');
    
    // Get a task to test with
    const tasks = await sql`
      SELECT id, name, status, priority, importance 
      FROM tasks 
      LIMIT 1
    `;
    
    if (tasks.length === 0) {
      console.log('❌ No tasks found in database');
      return;
    }
    
    const task = tasks[0];
    console.log('📋 Found task to test:', {
      id: task.id,
      name: task.name,
      status: task.status,
      priority: task.priority
    });
    
    // Try updating the task
    const updatedTask = await sql`
      UPDATE tasks 
      SET name = ${task.name + ' (EDITED)'}, 
          updated_at = NOW()
      WHERE id = ${task.id}
      RETURNING id, name, status, updated_at
    `;
    
    console.log('✅ Task updated successfully:', updatedTask[0]);
    
    // Check if the update persisted
    const verifyTask = await sql`
      SELECT id, name, updated_at 
      FROM tasks 
      WHERE id = ${task.id}
    `;
    
    console.log('🔍 Verified updated task:', verifyTask[0]);
    
  } catch (error) {
    console.error('❌ Error testing task edit:', error.message);
  } finally {
    await sql.end();
  }
}

testTaskEdit();