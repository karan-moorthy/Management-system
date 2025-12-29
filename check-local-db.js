const postgres = require('postgres');

async function main() {
  const sql = postgres('postgresql://postgres:admin@localhost:5432/pmsdb', { max: 1 });

  try {
    console.log('🔍 Checking user_sessions table...');
    
    // Check if user_sessions exists
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_sessions'
      )
    `;
    
    if (result[0].exists) {
      console.log('✅ user_sessions table already exists!');
    } else {
      console.log('📦 Creating user_sessions table...');
      
      // Create user_sessions table based on schema.ts
      await sql`
        CREATE TABLE user_sessions (
          id SERIAL PRIMARY KEY,
          session_token VARCHAR(255) UNIQUE NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          expires TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `;
      
      console.log('✅ user_sessions table created!');
    }
    
    // Check if admin user exists
    const users = await sql`SELECT * FROM users WHERE email = 'admin@ggs.com'`;
    
    if (users.length > 0) {
      console.log('✅ Admin user exists');
      console.log('📧 Email: admin@ggs.com');
      console.log('🔑 Password: password123');
    } else {
      console.log('⚠️  No admin user found. You may need to create one.');
    }
    
    console.log('\n🎉 Local database is ready!');
    
    await sql.end();
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    await sql.end();
    process.exit(1);
  }
}

main();
