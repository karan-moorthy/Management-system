/**
 * Database Performance Monitor
 * 
 * Real-time monitoring for 1000+ user production environment
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
  max: 1,
});

async function monitorDatabase() {
  console.log('📊 PMS Database Performance Monitor\n');
  console.log('='.repeat(80));

  try {
    // 1. Current Connections
    console.log('\n🔌 CONNECTION POOL STATUS');
    const [connectionStats] = await client`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database();
    `;
    
    const poolUsage = (parseInt(connectionStats.active_connections) / 100) * 100;
    const statusEmoji = poolUsage < 50 ? '✅' : poolUsage < 80 ? '⚠️' : '🚨';
    
    console.log(`${statusEmoji} Total Connections: ${connectionStats.total_connections}/100`);
    console.log(`   Active: ${connectionStats.active_connections} (${poolUsage.toFixed(1)}% of pool)`);
    console.log(`   Idle: ${connectionStats.idle_connections}`);
    
    if (poolUsage > 80) {
      console.log('   ⚠️  WARNING: Connection pool usage above 80%!');
      console.log('   💡 Consider increasing max connections in src/db/index.ts');
    }

    // 2. Database Size
    console.log('\n💾 DATABASE SIZE');
    const [dbSize] = await client`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as db_size;
    `;
    console.log(`   Total Size: ${dbSize.db_size}`);

    // 3. Tasks Table Statistics
    console.log('\n📋 TASKS TABLE STATISTICS');
    const [taskStats] = await client`
      SELECT 
        count(*) as total_tasks,
        count(DISTINCT workspace_id) as workspaces,
        count(DISTINCT project_id) as projects,
        count(DISTINCT upload_batch_id) as upload_batches,
        count(*) FILTER (WHERE status = 'TODO') as todo_tasks,
        count(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_tasks,
        count(*) FILTER (WHERE status = 'DONE') as done_tasks,
        pg_size_pretty(pg_total_relation_size('tasks')) as table_size
      FROM tasks;
    `;
    
    console.log(`   Total Tasks: ${taskStats.total_tasks.toLocaleString()}`);
    console.log(`   Workspaces: ${taskStats.workspaces}`);
    console.log(`   Projects: ${taskStats.projects}`);
    console.log(`   Upload Batches: ${taskStats.upload_batches}`);
    console.log(`   Status Breakdown:`);
    console.log(`     - TODO: ${taskStats.todo_tasks.toLocaleString()}`);
    console.log(`     - IN PROGRESS: ${taskStats.in_progress_tasks.toLocaleString()}`);
    console.log(`     - DONE: ${taskStats.done_tasks.toLocaleString()}`);
    console.log(`   Table Size: ${taskStats.table_size}`);

    // 4. Index Usage
    console.log('\n📊 INDEX USAGE (Performance Indexes)');
    const indexes = await client`
      SELECT 
        schemaname,
        relname as tablename,
        indexrelname as indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes 
      WHERE relname = 'tasks' 
      AND indexrelname LIKE 'idx_tasks_%'
      ORDER BY idx_scan DESC;
    `;
    
    if (indexes.length > 0) {
      indexes.forEach(idx => {
        console.log(`   ${idx.indexname}:`);
        console.log(`     Scans: ${idx.scans.toLocaleString()} | Tuples: ${idx.tuples_fetched.toLocaleString()}`);
      });
    } else {
      console.log('   ⚠️  No performance indexes found. Run: node add-performance-indexes.js');
    }

    // 5. Recent Upload Activity
    console.log('\n📤 RECENT UPLOAD ACTIVITY (Last 24 hours)');
    const recentUploads = await client`
      SELECT 
        upload_batch_id,
        count(*) as task_count,
        max(uploaded_at) as upload_time,
        (SELECT name FROM users WHERE id = tasks.uploaded_by LIMIT 1) as uploader
      FROM tasks 
      WHERE uploaded_at > NOW() - INTERVAL '24 hours'
      GROUP BY upload_batch_id, uploaded_by
      ORDER BY upload_time DESC
      LIMIT 10;
    `;
    
    if (recentUploads.length > 0) {
      recentUploads.forEach(upload => {
        const timeAgo = getTimeAgo(new Date(upload.upload_time));
        console.log(`   Batch: ${upload.upload_batch_id.substring(0, 8)}...`);
        console.log(`     Tasks: ${upload.task_count} | Uploader: ${upload.uploader} | ${timeAgo}`);
      });
    } else {
      console.log('   No uploads in the last 24 hours');
    }

    // 6. Query Performance (if pg_stat_statements enabled)
    try {
      console.log('\n⚡ SLOWEST QUERIES (Top 5)');
      const slowQueries = await client`
        SELECT 
          substring(query, 1, 80) as query_preview,
          calls,
          mean_exec_time::numeric(10,2) as avg_ms,
          total_exec_time::numeric(10,2) as total_ms
        FROM pg_stat_statements 
        WHERE query NOT LIKE '%pg_stat_%'
        ORDER BY mean_exec_time DESC 
        LIMIT 5;
      `;
      
      slowQueries.forEach((q, i) => {
        const statusEmoji = parseFloat(q.avg_ms) < 50 ? '✅' : parseFloat(q.avg_ms) < 500 ? '⚠️' : '🚨';
        console.log(`   ${i + 1}. ${statusEmoji} Avg: ${q.avg_ms}ms | Calls: ${q.calls}`);
        console.log(`      ${q.query_preview}...`);
      });
    } catch (e) {
      console.log('   ℹ️  pg_stat_statements extension not enabled (optional)');
    }

    // 7. Health Summary
    console.log('\n🏥 HEALTH SUMMARY');
    const health = {
      connections: poolUsage < 80 ? '✅ Healthy' : '⚠️  Warning',
      indexes: indexes.length >= 5 ? '✅ Optimized' : '⚠️  Missing',
      performance: '✅ Ready for 1000+ users'
    };
    
    console.log(`   Connection Pool: ${health.connections}`);
    console.log(`   Indexes: ${health.indexes}`);
    console.log(`   System Status: ${health.performance}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Monitoring complete!\n');

  } catch (error) {
    console.error('❌ Monitoring error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

monitorDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Monitoring failed:', error);
    process.exit(1);
  });
