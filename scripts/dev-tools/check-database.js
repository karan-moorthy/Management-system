const postgres = require('postgres');

// Your Neon PostgreSQL connection
const sql = postgres('postgresql://neondb_owner:EomvlH3HJPKt@ep-floral-tree-a522vux6.us-east-2.aws.neon.tech/neondb?sslmode=require', {
  ssl: 'require'
});

async function checkDatabase() {
  try {
    console.log('🔍 CHECKING YOUR POSTGRESQL DATABASE...\n');
    
    // Count records in each table
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    const workspaceCount = await sql`SELECT COUNT(*) as count FROM workspaces`;
    const memberCount = await sql`SELECT COUNT(*) as count FROM members`;
    const projectCount = await sql`SELECT COUNT(*) as count FROM projects`;
    const taskCount = await sql`SELECT COUNT(*) as count FROM tasks`;
    const invitationCount = await sql`SELECT COUNT(*) as count FROM invitations`;
    
    console.log('📊 RECORD COUNTS:');
    console.log(`👤 Users: ${userCount[0].count}`);
    console.log(`🏢 Workspaces: ${workspaceCount[0].count}`);
    console.log(`👥 Members: ${memberCount[0].count}`);
    console.log(`📁 Projects: ${projectCount[0].count}`);
    console.log(`✅ Tasks: ${taskCount[0].count}`);
    console.log(`📧 Invitations: ${invitationCount[0].count}`);
    
    // Show latest workspaces
    console.log('\n📋 YOUR LATEST WORKSPACES:');
    const workspaces = await sql`
      SELECT id, name, user_id, created_at 
      FROM workspaces 
      ORDER BY created_at DESC 
      LIMIT 3
    `;
    workspaces.forEach(ws => {
      console.log(`  • ${ws.name} (ID: ${ws.id.substring(0,8)}...)`);
      console.log(`    Created: ${ws.created_at}`);
    });
    
    console.log('\n🎯 DATA STORAGE LOCATION:');
    console.log('  Database: PostgreSQL (Neon Cloud)');
    console.log('  Host: ep-floral-tree-a522vux6.us-east-2.aws.neon.tech');
    console.log('  Database Name: neondb');
    console.log('  Status: ✅ CONNECTED & STORING DATA');
    
    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sql.end();
  }
}

checkDatabase();