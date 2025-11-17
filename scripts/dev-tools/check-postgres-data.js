const postgres = require('postgres');

async function checkPostgreSQL() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/pmsdb';
  console.log('🔗 Connecting to:', connectionString.replace(/:[^:]*@/, ':****@'));

  try {
    const sql = postgres(connectionString);
    
    console.log('\n🔍 Checking database connection...');
    const time = await sql`SELECT NOW() as current_time`;
    console.log('✅ Connected at:', time[0].current_time);
    
    console.log('\n📋 Available tables:');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    if (tables.length === 0) {
      console.log('❌ No tables found! The database might be empty.');
      await sql.end();
      return;
    }
    
    tables.forEach(table => {
      console.log('  ✓', table.table_name);
    });
    
    console.log('\n📊 Data counts in each table:');
    
    // Check if tables exist before querying
    const tableNames = tables.map(t => t.table_name);
    
    if (tableNames.includes('users')) {
      const userCount = await sql`SELECT COUNT(*) as count FROM users`;
      console.log('  👥 users:', userCount[0].count);
      
      if (userCount[0].count > 0) {
        const sampleUsers = await sql`SELECT id, name, email FROM users LIMIT 3`;
        console.log('     Sample users:');
        sampleUsers.forEach(user => {
          console.log('       -', user.name, `(${user.email})`);
        });
      }
    }
    
    if (tableNames.includes('workspaces')) {
      const workspaceCount = await sql`SELECT COUNT(*) as count FROM workspaces`;
      console.log('  🏢 workspaces:', workspaceCount[0].count);
      
      if (workspaceCount[0].count > 0) {
        const sampleWorkspaces = await sql`SELECT id, name, user_id FROM workspaces LIMIT 3`;
        console.log('     Sample workspaces:');
        sampleWorkspaces.forEach(ws => {
          console.log('       -', ws.name, `(ID: ${ws.id.substring(0, 8)}...)`);
        });
      }
    }
    
    if (tableNames.includes('projects')) {
      const projectCount = await sql`SELECT COUNT(*) as count FROM projects`;
      console.log('  📁 projects:', projectCount[0].count);
    }
    
    if (tableNames.includes('tasks')) {
      const taskCount = await sql`SELECT COUNT(*) as count FROM tasks`;
      console.log('  ✅ tasks:', taskCount[0].count);
      
      if (taskCount[0].count > 0) {
        const sampleTasks = await sql`SELECT id, name, status, workspace_id FROM tasks LIMIT 5`;
        console.log('     Sample tasks:');
        sampleTasks.forEach(task => {
          console.log('       -', task.name, `[${task.status}]`);
        });
      }
    }
    
    if (tableNames.includes('members')) {
      const memberCount = await sql`SELECT COUNT(*) as count FROM members`;
      console.log('  👤 members:', memberCount[0].count);
    }
    
    if (tableNames.includes('sessions')) {
      const sessionCount = await sql`SELECT COUNT(*) as count FROM sessions`;
      console.log('  🔐 sessions:', sessionCount[0].count);
    }
    
    console.log('\n🎯 Recent activity (last 5 operations):');
    
    if (tableNames.includes('tasks')) {
      const recentTasks = await sql`
        SELECT name, status, created_at, updated_at 
        FROM tasks 
        ORDER BY updated_at DESC 
        LIMIT 5
      `;
      
      if (recentTasks.length > 0) {
        console.log('     Recent task updates:');
        recentTasks.forEach(task => {
          const updateTime = new Date(task.updated_at).toLocaleString();
          console.log('       -', task.name, `[${task.status}]`, 'updated:', updateTime);
        });
      }
    }
    
    await sql.end();
    console.log('\n✅ Database verification complete!');
    
  } catch (error) {
    console.error('❌ Database connection error:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Possible issues:');
      console.error('   - PostgreSQL service is not running');
      console.error('   - Wrong host/port configuration');
      console.error('   - Firewall blocking connection');
    } else if (error.code === '28P01') {
      console.error('\n💡 Authentication failed:');
      console.error('   - Check username/password in DATABASE_URL');
      console.error('   - Verify PostgreSQL user permissions');
    } else if (error.code === '3D000') {
      console.error('\n💡 Database does not exist:');
      console.error('   - Create database "pmsdb" in PostgreSQL');
      console.error('   - Run: CREATE DATABASE pmsdb;');
    }
  }
}

checkPostgreSQL();