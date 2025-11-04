const postgres = require('postgres');

async function cleanTaskData() {
  const sql = postgres('postgresql://postgres:admin@localhost:5432/pmsdb');
  
  console.log('🧹 Cleaning corrupted task data...\n');
  
  try {
    // Backup current count
    const beforeCount = await sql`SELECT COUNT(*) as count FROM tasks`;
    console.log('📊 Current tasks:', beforeCount[0].count);
    
    // Delete all corrupted tasks
    await sql`DELETE FROM tasks`;
    console.log('✅ Deleted all corrupted tasks');
    
    // Create some sample tasks with proper data
    const workspaces = await sql`SELECT id FROM workspaces LIMIT 1`;
    const projects = await sql`SELECT id FROM projects LIMIT 1`;
    const users = await sql`SELECT id FROM users LIMIT 1`;
    
    if (workspaces.length > 0 && projects.length > 0 && users.length > 0) {
      const workspaceId = workspaces[0].id;
      const projectId = projects[0].id;
      const userId = users[0].id;
      
      // Insert clean sample tasks
      await sql`
        INSERT INTO tasks (id, name, description, status, workspace_id, project_id, assignee_id, position, due_date, created_at, updated_at)
        VALUES 
        (gen_random_uuid(), 'Setup Development Environment', 'Install and configure development tools', 'TODO', ${workspaceId}, ${projectId}, ${userId}, 1000, NOW() + INTERVAL '7 days', NOW(), NOW()),
        (gen_random_uuid(), 'Design Database Schema', 'Create tables and relationships for the application', 'IN_PROGRESS', ${workspaceId}, ${projectId}, ${userId}, 2000, NOW() + INTERVAL '5 days', NOW(), NOW()),
        (gen_random_uuid(), 'Implement User Authentication', 'Add login and registration functionality', 'IN_REVIEW', ${workspaceId}, ${projectId}, ${userId}, 3000, NOW() + INTERVAL '3 days', NOW(), NOW()),
        (gen_random_uuid(), 'Create Landing Page', 'Design and develop the main landing page', 'DONE', ${workspaceId}, ${projectId}, ${userId}, 4000, NOW() - INTERVAL '2 days', NOW(), NOW()),
        (gen_random_uuid(), 'Write Documentation', 'Create user guides and technical documentation', 'TODO', ${workspaceId}, ${projectId}, ${userId}, 5000, NOW() + INTERVAL '10 days', NOW(), NOW())
      `;
      
      console.log('✅ Created 5 clean sample tasks');
    }
    
    // Verify new data
    const afterCount = await sql`SELECT COUNT(*) as count FROM tasks`;
    const sampleTasks = await sql`SELECT id, name, status FROM tasks LIMIT 5`;
    
    console.log('\n📊 Results:');
    console.log('New task count:', afterCount[0].count);
    console.log('\nSample tasks:');
    sampleTasks.forEach(task => {
      console.log(`  ✓ ${task.name} [${task.status}]`);
    });
    
    await sql.end();
    console.log('\n🎉 Task data cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    await sql.end();
  }
}

cleanTaskData();