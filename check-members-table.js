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

async function checkMembersTable() {
  try {
    console.log('🔍 Checking members table structure...');
    
    // Get table structure
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'members'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📊 Members table columns:');
    columns.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type}`);
    });
    
    // Get some sample data
    const sampleData = await sql`SELECT * FROM members LIMIT 3`;
    console.log(`\n📋 Sample data (${sampleData.length} rows):`);
    sampleData.forEach((row, index) => {
      console.log(`${index + 1}. ${JSON.stringify(row, null, 2)}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkMembersTable();