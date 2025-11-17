import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from './src/db/index.js';
import { tasks } from './src/db/schema.js';

async function checkTasks() {
  try {
    console.log('🔍 Checking tasks in database...');
    
    const allTasks = await db.select().from(tasks);
    
    console.log(`Found ${allTasks.length} tasks in the database:`);
    
    if (allTasks.length > 0) {
      console.log('\n📋 Sample tasks:');
      allTasks.slice(0, 5).forEach((task, index) => {
        console.log(`${index + 1}. [${task.issueId}] ${task.summary}`);
        console.log(`   Status: ${task.status} | Priority: ${task.priority} | Project: ${task.projectName}`);
        console.log(`   Created: ${task.created} | Due: ${task.dueDate || 'No due date'}`);
        console.log('');
      });
    }
    
    // Check schema structure
    console.log('\n🏗️ Task table structure check:');
    console.log('✅ summary field:', typeof allTasks[0]?.summary);
    console.log('✅ issueId field:', typeof allTasks[0]?.issueId);
    console.log('✅ issueType field:', typeof allTasks[0]?.issueType);
    console.log('✅ projectName field:', typeof allTasks[0]?.projectName);
    
  } catch (error) {
    console.error('❌ Error checking tasks:', error);
  }
}

checkTasks().then(() => {
  console.log('✅ Check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});