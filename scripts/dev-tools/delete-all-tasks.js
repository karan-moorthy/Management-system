const { config } = require('dotenv');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

config({ path: '.env.local' });

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function deleteAllTasks() {
  try {
    const { tasks } = await import('./src/db/schema.ts');
    
    // Count before deletion
    const before = await db.select().from(tasks);
    console.log(`\n⚠️  Found ${before.length} tasks in database`);
    console.log('\n🗑️  Deleting all tasks...');
    
    // Delete all tasks
    await db.delete(tasks);
    
    // Count after deletion
    const after = await db.select().from(tasks);
    console.log(`\n✅ Deleted ${before.length - after.length} tasks`);
    console.log(`📊 Remaining tasks: ${after.length}`);
    
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

deleteAllTasks();
