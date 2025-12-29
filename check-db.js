const { Pool } = require('pg');

async function checkDB() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb'
  });

  console.log('🔍 Checking database connection and data...\n');

  // Test connection
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');
  } catch (e) {
    console.error('❌ Connection failed:', e.message);
    await pool.end();
    return;
  }

  // Check tables
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema='public' 
    ORDER BY table_name
  `);
  console.log('📋 Tables in database:');
  tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
  console.log('');

  // Check users
  const users = await pool.query('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC');
  console.log(`👥 Users (${users.rows.length}):`);
  users.rows.forEach(user => {
    console.log(`  - ${user.email} (${user.name}) - ID: ${user.id}`);
  });
  console.log('');

  // Check workspaces
  const workspaces = await pool.query('SELECT id, name, user_id FROM workspaces');
  console.log(`🏢 Workspaces (${workspaces.rows.length}):`);
  workspaces.rows.forEach(ws => {
    console.log(`  - ${ws.name} - ID: ${ws.id}`);
  });
  console.log('');

  // Check members
  const members = await pool.query(`
    SELECT m.id, u.email, m.role, w.name as workspace_name
    FROM members m
    JOIN users u ON m.user_id = u.id
    JOIN workspaces w ON m.workspace_id = w.id
  `);
  console.log(`👤 Members (${members.rows.length}):`);
  members.rows.forEach(member => {
    console.log(`  - ${member.email} (${member.role}) in ${member.workspace_name}`);
  });
  console.log('');

  // Check sessions
  const sessions = await pool.query('SELECT COUNT(*) as count FROM user_sessions');
  console.log(`🔑 Active sessions: ${sessions.rows[0].count}\n`);

  await pool.end();
}

checkDB().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
