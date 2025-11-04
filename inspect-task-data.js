const postgres = require('postgres');

async function inspectTaskData() {
  const sql = postgres('postgresql://postgres:admin@localhost:5432/pmsdb');
  
  console.log('🔍 Inspecting task data structure...\n');
  
  try {
    // Get table structure
    const columns = await sql`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tasks'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Tasks table structure:');
    columns.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Get a sample task with raw data
    console.log('\n📄 Sample task (raw data):');
    const sampleTask = await sql`
      SELECT id, name, description, status, created_at, updated_at, workspace_id
      FROM tasks 
      LIMIT 1
    `;
    
    if (sampleTask.length > 0) {
      const task = sampleTask[0];
      console.log('Task ID:', task.id);
      console.log('Name (raw):', JSON.stringify(task.name));
      console.log('Name (buffer):', Buffer.from(task.name || '', 'utf8'));
      console.log('Description:', JSON.stringify(task.description));
      console.log('Status:', task.status);
      console.log('Workspace ID:', task.workspace_id);
      
      // Try to decode if it's base64 or other encoding
      try {
        const decoded = Buffer.from(task.name || '', 'base64').toString('utf8');
        console.log('Decoded (base64):', decoded);
      } catch (e) {
        console.log('Not base64 encoded');
      }
    }
    
    // Check workspace data
    console.log('\n🏢 Sample workspace data:');
    const sampleWs = await sql`SELECT id, name, user_id FROM workspaces LIMIT 1`;
    if (sampleWs.length > 0) {
      console.log('Workspace:', sampleWs[0].name);
      console.log('ID:', sampleWs[0].id);
    }
    
    await sql.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sql.end();
  }
}

inspectTaskData();