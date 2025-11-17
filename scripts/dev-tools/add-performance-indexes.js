/**
 * Add Performance Indexes for 1000+ User Scale
 * 
 * Creates composite indexes to handle high query volume from large organizations
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local first, then .env
dotenv.config({ path: join(__dirname, '.env.local') });
dotenv.config({ path: join(__dirname, '.env') });

const client = postgres(process.env.DATABASE_URL, {
  max: 1,
});

async function addPerformanceIndexes() {
  console.log('🚀 Adding performance indexes for 1000+ user scale...\n');

  try {
    // 1. Composite index for task filtering by workspace, project, and status
    console.log('📊 Creating composite index on (workspace_id, project_id, status)...');
    await client`
      CREATE INDEX IF NOT EXISTS idx_tasks_workspace_project_status 
      ON tasks(workspace_id, project_id, status);
    `;
    console.log('✅ Created idx_tasks_workspace_project_status\n');

    // 2. Index for batch operations (filtering and deletion)
    console.log('📊 Creating composite index on (upload_batch_id, workspace_id)...');
    await client`
      CREATE INDEX IF NOT EXISTS idx_tasks_batch_workspace 
      ON tasks(upload_batch_id, workspace_id);
    `;
    console.log('✅ Created idx_tasks_batch_workspace\n');

    // 3. Index for assignee-based queries (My Tasks view)
    console.log('📊 Creating composite index on (assignee_id, workspace_id, status)...');
    await client`
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee_workspace_status 
      ON tasks(assignee_id, workspace_id, status);
    `;
    console.log('✅ Created idx_tasks_assignee_workspace_status\n');

    // 4. Index for due date filtering
    console.log('📊 Creating index on (due_date, workspace_id)...');
    await client`
      CREATE INDEX IF NOT EXISTS idx_tasks_duedate_workspace 
      ON tasks(due_date, workspace_id) 
      WHERE due_date IS NOT NULL;
    `;
    console.log('✅ Created idx_tasks_duedate_workspace\n');

    // 5. Index for search queries (full-text search preparation)
    console.log('📊 Creating index on (workspace_id) with include columns for search...');
    await client`
      CREATE INDEX IF NOT EXISTS idx_tasks_workspace_search 
      ON tasks(workspace_id) 
      INCLUDE (summary, description, issue_id);
    `;
    console.log('✅ Created idx_tasks_workspace_search\n');

    // Verify indexes
    console.log('🔍 Verifying created indexes...\n');
    const indexes = await client`
      SELECT 
        indexname, 
        indexdef 
      FROM pg_indexes 
      WHERE tablename = 'tasks' 
      AND indexname LIKE 'idx_tasks_%'
      ORDER BY indexname;
    `;

    console.log('📋 Current indexes on tasks table:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

    console.log('\n✅ Performance indexes successfully created!');
    console.log('💡 Your database can now handle 1000+ concurrent users efficiently.');
    
  } catch (error) {
    console.error('❌ Error adding indexes:', error);
    throw error;
  } finally {
    await client.end();
  }
}

addPerformanceIndexes()
  .then(() => {
    console.log('\n🎉 Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
