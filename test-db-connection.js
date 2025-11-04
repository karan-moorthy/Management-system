const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('🔍 Testing PostgreSQL Database Connection...\n');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL not found in environment variables');
    console.log('   Please check your .env.local file');
    return;
  }
  
  console.log('📍 Database URL:', databaseUrl.replace(/:[^:@]+@/, ':****@')); // Hide password
  
  const client = new Client({
    connectionString: databaseUrl,
  });
  
  try {
    console.log('\n⏳ Attempting to connect...');
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL database!\n');
    
    // Test query
    console.log('🔍 Testing database query...');
    const result = await client.query('SELECT version()');
    console.log('✅ Query successful!');
    console.log('📊 PostgreSQL Version:', result.rows[0].version.split(' ').slice(0, 2).join(' '));
    
    // Check if tables exist
    console.log('\n🔍 Checking for tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('⚠️  No tables found in the database');
      console.log('   You may need to run migrations');
    } else {
      console.log(`✅ Found ${tablesResult.rows.length} table(s):`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }
    
    console.log('\n✅ Database connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database Connection Failed!');
    console.error('\nError Details:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Make sure PostgreSQL is running');
      console.error('   2. Check if the port (5432) is correct');
      console.error('   3. Verify the host is accessible (localhost)');
    } else if (error.code === '28P01') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check your database password in .env.local');
      console.error('   2. Verify the username is correct');
    } else if (error.code === '3D000') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. The database "pmsdb" does not exist');
      console.error('   2. Create it with: createdb pmsdb');
    }
    
  } finally {
    await client.end();
  }
}

testConnection();
