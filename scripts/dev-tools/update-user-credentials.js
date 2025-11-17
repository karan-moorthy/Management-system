const postgres = require('postgres');
require('dotenv/config');

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'pmsdb',
  username: 'postgres',
  password: 'admin'
});

async function updatePasswords() {
  try {
    console.log('🔧 Updating user passwords for easier login...');
    
    // Get current users
    const users = await sql`
      SELECT id, name, email 
      FROM users 
      ORDER BY name
    `;
    
    console.log('\n📋 Current users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
    });
    
    // Update passwords to simple ones
    const passwordUpdates = [
      { email: 'demo@example.com', password: 'demo123', name: 'Demo User' },
      { email: 'arunraj@example.com', password: 'arun123', name: 'Arunraj' },
      { email: 'aishwarya@example.com', password: 'aish123', name: 'Aishwarya' },
      { email: 'chandramohan@example.com', password: 'chandra123', name: 'Chandramohan' },
      { email: 'vinoth@example.com', password: 'vinoth123', name: 'Vinoth' }
    ];
    
    console.log('\n🔄 Updating passwords...');
    
    for (const update of passwordUpdates) {
      try {
        const result = await sql`
          UPDATE users 
          SET password = ${update.password}
          WHERE email = ${update.email}
        `;
        
        console.log(`✅ Updated ${update.name} password to: ${update.password}`);
      } catch (error) {
        console.error(`❌ Error updating ${update.name}:`, error.message);
      }
    }
    
    // Show updated credentials
    const updatedUsers = await sql`
      SELECT id, name, email, password 
      FROM users 
      ORDER BY name
    `;
    
    console.log('\n📋 Updated login credentials:');
    console.log('='.repeat(60));
    updatedUsers.forEach((user, index) => {
      const shortId = user.id.split('-')[0]; // Show first part of UUID for reference
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log(`   Short ID: ${shortId}...`);
      console.log('');
    });
    
    console.log('🎉 All passwords updated successfully!');
    console.log('\n📝 Quick Login Reference:');
    console.log('========================');
    updatedUsers.forEach(user => {
      console.log(`${user.name}: ${user.email} / ${user.password}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating passwords:', error.message);
  } finally {
    await sql.end();
  }
}

updatePasswords();