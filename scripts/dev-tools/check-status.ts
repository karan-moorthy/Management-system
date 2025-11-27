import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, tasks, workspaces, projects } from '../../src/db/schema';

config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pmsdb';
const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function checkStatus() {
  try {
    console.log('🔍 Checking application status...\n');

    // Check users
    const userCount = await db.select().from(users);
    console.log(`👥 Users: ${userCount.length} total`);
    userCount.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
    });

    // Check workspaces
    const workspaceCount = await db.select().from(workspaces);
    console.log(`\n🏢 Workspaces: ${workspaceCount.length} total`);
    workspaceCount.forEach(ws => {
      console.log(`   - ${ws.name}`);
    });

    // Check projects
    const projectCount = await db.select().from(projects);
    console.log(`\n📁 Projects: ${projectCount.length} total`);
    projectCount.forEach(proj => {
      console.log(`   - ${proj.name}`);
    });

    // Check tasks
    const taskCount = await db.select().from(tasks);
    console.log(`\n✅ Tasks: ${taskCount.length} total`);
    if (taskCount.length > 0) {
      console.log('Recent tasks:');
      taskCount.slice(-5).forEach(task => {
        console.log(`   - ${task.summary || task.issueId} (${task.status}, Due: ${task.dueDate?.toDateString()})`);
      });
    }

    console.log('\n🎉 System Status: Ready for CSV Upload!');
    console.log('📋 Next Steps:');
    console.log('   1. Open application at http://localhost:3000');
    console.log('   2. Create/select a workspace and project');
    console.log('   3. Use CSV upload with sample-project-tasks.csv');
    
  } catch (error) {
    console.error('❌ Status check failed:', error);
  } finally {
    await client.end();
  }
}

checkStatus();