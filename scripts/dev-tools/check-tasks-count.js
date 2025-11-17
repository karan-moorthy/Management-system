const { config } = require('dotenv');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

config({ path: '.env.local' });

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function checkTasks() {
  try {
    const { tasks } = await import('./src/db/schema.ts');
    const result = await db.select().from(tasks);
    console.log('\n📊 Database Status:');
    console.log('═'.repeat(50));
    console.log(`Total tasks in database: ${result.length}`);
    
    if (result.length > 0) {
      console.log('\nFirst 5 tasks:');
      result.slice(0, 5).forEach(task => {
        console.log(`  - ${task.summary} (Project: ${task.projectId})`);
      });
    }
    
    await client.end();
  } catch (error) {
    console.error('Error:', error);
    await client.end();
    process.exit(1);
  }
}

checkTasks();
