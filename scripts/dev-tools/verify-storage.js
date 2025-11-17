// Simple script to verify PostgreSQL data storage
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

async function verifyDataStorage() {
  console.log('🔍 VERIFYING YOUR DATA STORAGE...\n');
  
  // Use your existing database connection
  const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:EomvlH3HJPKt@ep-floral-tree-a522vux6.us-east-2.aws.neon.tech/neondb?sslmode=require';
  
  const client = postgres(connectionString, { ssl: 'require' });
  const db = drizzle(client);
  
  try {
    // Simple count queries
    const userCount = await client`SELECT COUNT(*) as count FROM users`;
    const workspaceCount = await client`SELECT COUNT(*) as count FROM workspaces`;
    const projectCount = await client`SELECT COUNT(*) as count FROM projects`;
    const taskCount = await client`SELECT COUNT(*) as count FROM tasks`;
    const memberCount = await client`SELECT COUNT(*) as count FROM members`;
    
    console.log('📊 DATA COUNTS IN POSTGRESQL:');
    console.log(`👤 Users: ${userCount[0].count}`);
    console.log(`🏢 Workspaces: ${workspaceCount[0].count}`);
    console.log(`📁 Projects: ${projectCount[0].count}`);
    console.log(`✅ Tasks: ${taskCount[0].count}`);
    console.log(`👥 Members: ${memberCount[0].count}`);
    
    if (workspaceCount[0].count > 0) {
      console.log('\n📋 RECENT WORKSPACES:');
      const workspaces = await client`SELECT name, id, created_at FROM workspaces ORDER BY created_at DESC LIMIT 3`;
      workspaces.forEach(ws => {
        console.log(`  • ${ws.name} (${ws.id.substring(0, 8)}...) - ${ws.created_at.toDateString()}`);
      });
    }
    
    console.log('\n🎯 STORAGE CONFIRMATION:');
    console.log('  ✅ Database Type: PostgreSQL');
    console.log('  ✅ Provider: Neon Cloud');  
    console.log('  ✅ Connection: Active');
    console.log('  ✅ Data Storage: Confirmed');
    
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });
verifyDataStorage();