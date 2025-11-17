const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { users } = require('./src/db/schema.ts');
const { eq } = require('drizzle-orm');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function checkProfileData() {
  try {
    // Get all users with their profile data
    const allUsers = await db.select().from(users);

    console.log('\n=== All Users with Profile Data ===\n');
    allUsers.forEach(user => {
      console.log(`User: ${user.name} (${user.email})`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Native: ${user.native || 'N/A'}`);
      console.log(`  Mobile: ${user.mobileNo || 'N/A'}`);
      console.log(`  Experience: ${user.experience ?? 'N/A'} years`);
      console.log(`  Skills: ${user.skills ? JSON.stringify(user.skills) : 'N/A'}`);
      console.log(`  Date of Birth: ${user.dateOfBirth || 'N/A'}`);
      console.log(`  Designation: ${user.designation || 'N/A'}`);
      console.log(`  Department: ${user.department || 'N/A'}`);
      console.log(`  Date of Joining: ${user.dateOfJoining || 'N/A'}`);
      console.log(`  Created: ${user.createdAt}`);
      console.log(`  Updated: ${user.updatedAt}`);
      console.log('');
    });

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Error checking profile data:', error);
    await client.end();
    process.exit(1);
  }
}

checkProfileData();
