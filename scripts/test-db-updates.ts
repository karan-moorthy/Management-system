import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

(async () => {
  try {
    console.log('📊 Testing database updates...\n');
    
    // Get a sample task
    const [task] = await db.select().from(tasks).limit(1);
    
    if (!task) {
      console.log('❌ No tasks found in database');
      return;
    }
    
    console.log('🔍 Original Task:');
    console.log('  ID:', task.id);
    console.log('  Summary:', task.summary?.slice(0, 50) + '...');
    console.log('  Status:', task.status);
    console.log('  Priority:', task.priority);
    console.log('  AssigneeId:', task.assigneeId);
    console.log('  DueDate:', task.dueDate);
    
    // Test status update
    console.log('\n🔄 Testing status update...');
    const newStatus = task.status === 'To Do' ? 'In Progress' : 'To Do';
    
    const [statusUpdated] = await db
      .update(tasks)
      .set({ 
        status: newStatus,
        updated: new Date()
      })
      .where(eq(tasks.id, task.id))
      .returning();
    
    console.log('  ✅ Status updated:', task.status, '→', statusUpdated.status);
    
    // Test priority update
    console.log('\n🔄 Testing priority update...');
    const newPriority = task.priority === 'Low' ? 'High' : 'Low';
    
    const [priorityUpdated] = await db
      .update(tasks)
      .set({ 
        priority: newPriority,
        updated: new Date()
      })
      .where(eq(tasks.id, task.id))
      .returning();
    
    console.log('  ✅ Priority updated:', task.priority, '→', priorityUpdated.priority);
    
    // Test due date update
    console.log('\n🔄 Testing due date update...');
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + 7); // 7 days from now
    
    const [dateUpdated] = await db
      .update(tasks)
      .set({ 
        dueDate: newDueDate,
        updated: new Date()
      })
      .where(eq(tasks.id, task.id))
      .returning();
    
    console.log('  ✅ Due date updated:', task.dueDate, '→', dateUpdated.dueDate);
    
    // Revert all changes
    console.log('\n↩️  Reverting all changes...');
    await db
      .update(tasks)
      .set({ 
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        updated: new Date()
      })
      .where(eq(tasks.id, task.id));
    
    console.log('  ✅ All changes reverted successfully');
    
    console.log('\n✨ Database update test completed successfully!');
    console.log('   All fields can be updated and persisted correctly.');
    
  } catch (error) {
    console.error('❌ Error testing database updates:', error);
    process.exit(1);
  }
})();
