/**
 * Performance Test: Batch Insert vs Sequential Insert
 * 
 * Demonstrates the 10x speedup from batch processing
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '.env') });

const client = postgres(process.env.DATABASE_URL, {
  max: 10,
});

async function testPerformance() {
  console.log('🚀 CSV Upload Performance Test\n');
  console.log('='.repeat(80));

  try {
    // Create test workspace and project
    const [workspace] = await client`
      INSERT INTO workspaces (name, user_id, invite_code)
      VALUES ('Performance Test Workspace', (SELECT id FROM users LIMIT 1), 'TEST123')
      RETURNING id;
    `;

    const [project] = await client`
      INSERT INTO projects (name, workspace_id, user_id)
      VALUES ('Performance Test Project', ${workspace.id}, (SELECT id FROM users LIMIT 1))
      RETURNING id;
    `;

    const [user] = await client`SELECT id FROM users LIMIT 1`;

    console.log(`✅ Created test workspace and project\n`);

    // Generate 1000 test tasks
    const taskCount = 1000;
    const generateTask = (i) => ({
      summary: `Performance Test Task ${i}`,
      issue_id: `PERF-${i}`,
      issue_type: 'Task',
      status: 'TODO',
      project_name: 'Performance Test',
      priority: 'MEDIUM',
      assignee_id: user.id,
      reporter_id: user.id,
      creator_id: user.id,
      project_id: project.id,
      workspace_id: workspace.id,
      position: 1000 + i,
      actual_hours: 0,
    });

    // Test 1: Sequential Insert (Old Method)
    console.log('📊 TEST 1: Sequential Insert (Old Method)');
    console.log('   Inserting 1000 tasks one-by-one...');
    
    const sequentialStart = Date.now();
    const uploadBatch1 = crypto.randomUUID();
    
    for (let i = 0; i < taskCount; i++) {
      await client`
        INSERT INTO tasks ${client([{
          ...generateTask(i),
          upload_batch_id: uploadBatch1,
          uploaded_at: new Date(),
          uploaded_by: user.id,
        }])}
      `;
    }
    
    const sequentialTime = Date.now() - sequentialStart;
    console.log(`   ⏱️  Time: ${(sequentialTime / 1000).toFixed(2)} seconds`);
    console.log(`   📈 Rate: ${(taskCount / (sequentialTime / 1000)).toFixed(0)} tasks/second\n`);

    // Test 2: Batch Insert (New Method)
    console.log('📊 TEST 2: Batch Insert (New Method - 100 rows per batch)');
    console.log('   Inserting 1000 tasks in batches of 100...');
    
    const batchStart = Date.now();
    const uploadBatch2 = crypto.randomUUID();
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < taskCount; i += BATCH_SIZE) {
      const batch = [];
      for (let j = i; j < Math.min(i + BATCH_SIZE, taskCount); j++) {
        batch.push({
          ...generateTask(taskCount + j),
          upload_batch_id: uploadBatch2,
          uploaded_at: new Date(),
          uploaded_by: user.id,
        });
      }
      
      await client`INSERT INTO tasks ${client(batch)}`;
    }
    
    const batchTime = Date.now() - batchStart;
    console.log(`   ⏱️  Time: ${(batchTime / 1000).toFixed(2)} seconds`);
    console.log(`   📈 Rate: ${(taskCount / (batchTime / 1000)).toFixed(0)} tasks/second\n`);

    // Results
    console.log('='.repeat(80));
    console.log('📊 PERFORMANCE COMPARISON\n');
    console.log(`Sequential Insert: ${(sequentialTime / 1000).toFixed(2)}s`);
    console.log(`Batch Insert:      ${(batchTime / 1000).toFixed(2)}s`);
    console.log(`\n🚀 Speedup: ${(sequentialTime / batchTime).toFixed(1)}x faster with batch inserts!`);
    console.log(`💰 Time Saved: ${((sequentialTime - batchTime) / 1000).toFixed(2)} seconds per 1000 tasks`);
    
    const savingsPerDay = ((sequentialTime - batchTime) / 1000) * 50; // 50 uploads per day
    console.log(`💡 Daily Savings: ${(savingsPerDay / 60).toFixed(1)} minutes (50 uploads/day)`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await client`DELETE FROM tasks WHERE upload_batch_id IN (${uploadBatch1}, ${uploadBatch2})`;
    await client`DELETE FROM projects WHERE id = ${project.id}`;
    await client`DELETE FROM workspaces WHERE id = ${workspace.id}`;
    console.log('✅ Cleanup complete\n');

    console.log('='.repeat(80));
    console.log('🎉 Performance test complete!\n');

  } catch (error) {
    console.error('❌ Test error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

testPerformance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
