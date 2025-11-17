const postgres = require('postgres');
const bcrypt = require('bcryptjs');
require('dotenv/config');

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'pmsdb',
  username: 'postgres',
  password: 'admin'
});

async function hashPasswords() {
  try {
    console.log('🔧 Hashing user passwords for proper authentication...');
    
    // Get current users with plain text passwords
    const users = await sql`
      SELECT id, name, email, password 
      FROM users 
      ORDER BY name
    `;
    
    console.log('\n📋 Current users with plain text passwords:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Password: ${user.password}`);
    });
    
    // Hash and update passwords
    const passwordUpdates = [
      { email: 'demo@example.com', password: 'demo123', name: 'Demo User' },
      { email: 'arunraj@example.com', password: 'arun123', name: 'Arunraj' },
      { email: 'aishwarya@example.com', password: 'aish123', name: 'Aishwarya' },
      { email: 'chandramohan@example.com', password: 'chandra123', name: 'Chandramohan' },
      { email: 'vinoth@example.com', password: 'vinoth123', name: 'Vinoth' }
    ];
    
    console.log('\n🔄 Hashing and updating passwords...');
    
    for (const update of passwordUpdates) {
      try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(update.password, 10);
        
        // Update in database
        await sql`
          UPDATE users 
          SET password = ${hashedPassword}
          WHERE email = ${update.email}
        `;
        
        console.log(`✅ Updated ${update.name} - Plain: ${update.password} → Hashed: ${hashedPassword.substring(0, 20)}...`);
      } catch (error) {
        console.error(`❌ Error updating ${update.name}:`, error.message);
      }
    }
    
    // Verify the updates
    const updatedUsers = await sql`
      SELECT name, email, password 
      FROM users 
      ORDER BY name
    `;
    
    console.log('\n📋 Updated users with hashed passwords:');
    console.log('='.repeat(80));
    updatedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Hashed Password: ${user.password.substring(0, 30)}...`);
      console.log('');
    });
    
    console.log('🎉 All passwords properly hashed!');
    console.log('\n📝 Login Instructions:');
    console.log('========================');
    console.log('You can now login with these credentials:');
    passwordUpdates.forEach(update => {
      console.log(`- Email: ${update.email} | Password: ${update.password}`);
    });
    
    console.log('\n⚡ The passwords are now properly hashed and authentication should work!');
    
  } catch (error) {
    console.error('❌ Error hashing passwords:', error.message);
  } finally {
    await sql.end();
  }
}

hashPasswords();