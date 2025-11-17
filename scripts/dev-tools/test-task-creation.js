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

async function testTaskCreation() {
  try {
    console.log('🧪 Testing task creation...');
    
    // Get workspace and project IDs
    const workspaces = await sql`SELECT id, name FROM workspaces LIMIT 1`;
    const projects = await sql`SELECT id, name FROM projects LIMIT 1`;
    const members = await sql`SELECT "user_id", name FROM members LIMIT 1`;
    
    if (workspaces.length === 0 || projects.length === 0) {
      console.log('❌ No workspace or project found. Please create them first.');
      return;
    }
    
    const workspaceId = workspaces[0].id;
    const projectId = projects[0].id;
    const assigneeId = members.length > 0 ? members[0].user_id : null;
    
    console.log(`📍 Using workspace: ${workspaces[0].name} (${workspaceId})`);
    console.log(`📍 Using project: ${projects[0].name} (${projectId})`);
    if (assigneeId) {
      console.log(`👤 Assignee: ${members[0].name} (${assigneeId})`);
    }
    
    // Create a test task
    const taskName = `Test Task - ${new Date().toLocaleTimeString()}`;
    const taskDescription = `This is a test task created at ${new Date().toISOString()}`;
    
    const newTask = await sql`
      INSERT INTO tasks (
        name, 
        description, 
        status, 
        priority, 
        importance,
        position,
        due_date,
        assignee_id,
        project_id,
        workspace_id
      ) VALUES (
        ${taskName},
        ${taskDescription},
        'TODO',
        'MEDIUM',
        'MEDIUM',
        1000,
        ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}, -- 7 days from now
        ${assigneeId},
        ${projectId},
        ${workspaceId}
      ) RETURNING *
    `;
    
    console.log('✅ Task created successfully!');
    console.log(`📝 Task details:`);
    console.log(`   ID: ${newTask[0].id}`);
    console.log(`   Name: ${newTask[0].name}`);
    console.log(`   Description: ${newTask[0].description}`);
    console.log(`   Status: ${newTask[0].status}`);
    console.log(`   Priority: ${newTask[0].priority}`);
    console.log(`   Created: ${newTask[0].created_at}`);
    
    // Verify task can be read back
    const verifyTask = await sql`
      SELECT 
        t.id, t.name, t.description, t.status, t.priority,
        p.name as project_name,
        m.name as assignee_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN members m ON t.assignee_id = m."user_id"
      WHERE t.id = ${newTask[0].id}
    `;
    
    if (verifyTask.length > 0) {
      console.log('✅ Task verification successful!');
      console.log(`   Task: ${verifyTask[0].name}`);
      console.log(`   Project: ${verifyTask[0].project_name || 'None'}`);
      console.log(`   Assignee: ${verifyTask[0].assignee_name || 'Unassigned'}`);
    } else {
      console.log('❌ Task verification failed!');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await sql.end();
  }
}

testTaskCreation();