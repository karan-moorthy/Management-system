import { config } from 'dotenv';
import { db } from './src/db/index';
import { users, sessions } from './src/db/schema';
import { sql } from 'drizzle-orm';

config({ path: '.env.local' });

async function checkAuth() {
  try {
    console.log('🔍 Checking authentication setup...\n');
    
    // Check users table
    const allUsers = await db.select().from(users);
    console.log(`📊 Total users in database: ${allUsers.length}`);
    
    if (allUsers.length > 0) {
      console.log('\nUsers:');
      allUsers.forEach(user => {
        console.log(`  - ${user.email} (ID: ${user.id.substring(0, 8)}...)`);
        console.log(`    Name: ${user.name}`);
        console.log(`    Has password: ${user.password ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('⚠️  No users found in database');
      console.log('   You need to register a new user first');
    }
    
    // Check sessions table
    const allSessions = await db.select().from(sessions);
    console.log(`\n📊 Active sessions: ${allSessions.length}`);
    
    if (allSessions.length > 0) {
      console.log('\nSessions:');
      allSessions.forEach(session => {
        const isExpired = session.expires < new Date();
        console.log(`  - User ID: ${session.userId.substring(0, 8)}...`);
        console.log(`    Expires: ${session.expires}`);
        console.log(`    Status: ${isExpired ? '❌ Expired' : '✅ Active'}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAuth();
