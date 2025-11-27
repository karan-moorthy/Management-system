import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../../src/db/schema';
import { eq } from 'drizzle-orm';

config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pmsdb';
const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function createUsers() {
  try {
    console.log('Creating users for CSV upload...');

    const usersToCreate = [
      { name: 'Arunraj', email: 'arunraj@example.com' },
      { name: 'Aishwarya', email: 'aishwarya@example.com' },
      { name: 'Chandramohan', email: 'chandramohan@example.com' },
      { name: 'Vinoth', email: 'vinoth@example.com' }
    ];

    for (const userData of usersToCreate) {
      // Check if user already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existing.length === 0) {
        const [newUser] = await db
          .insert(users)
          .values(userData)
          .returning();
        
        console.log(`✅ Created user: ${newUser.name} (${newUser.email})`);
      } else {
        console.log(`ℹ️  User already exists: ${userData.name} (${userData.email})`);
      }
    }

    // Show all users
    const allUsers = await db.select().from(users);
    console.log('\n📋 All users in database:');
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });

    console.log('\n🎉 User creation completed!');
    
  } catch (error) {
    console.error('❌ Error creating users:', error);
  } finally {
    await client.end();
  }
}

createUsers();