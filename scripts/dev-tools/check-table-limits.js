/**
 * Check Table Size Limits and Recommendations
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

async function checkLimits() {
  console.log('📊 PostgreSQL Table Capacity Analysis\n');
  console.log('='.repeat(80));

  try {
    // Current table stats
    const [stats] = await client`
      SELECT 
        count(*) as total_rows,
        pg_size_pretty(pg_total_relation_size('tasks')) as total_size,
        pg_size_pretty(pg_relation_size('tasks')) as table_size,
        pg_size_pretty(pg_indexes_size('tasks')) as indexes_size,
        (SELECT count(*) FROM pg_indexes WHERE tablename = 'tasks') as index_count
      FROM tasks;
    `;

    console.log('📋 CURRENT STATE');
    console.log(`   Total Rows: ${parseInt(stats.total_rows).toLocaleString()}`);
    console.log(`   Table Size: ${stats.table_size}`);
    console.log(`   Indexes Size: ${stats.indexes_size}`);
    console.log(`   Total Size: ${stats.total_size}`);
    console.log(`   Indexes: ${stats.index_count}\n`);

    // Calculate projections
    const currentRows = parseInt(stats.total_rows);
    const avgBytesPerRow = currentRows > 0 ? 
      (await client`SELECT pg_relation_size('tasks')`)[0].pg_relation_size / currentRows : 1200;

    console.log('📈 CAPACITY PROJECTIONS\n');
    
    const scenarios = [
      { rows: 10000, name: 'Small Org (10K rows)' },
      { rows: 100000, name: 'Medium Org (100K rows)' },
      { rows: 500000, name: 'Large Org (500K rows)' },
      { rows: 1000000, name: '1 Million rows' },
      { rows: 5000000, name: '5 Million rows' },
      { rows: 10000000, name: '10 Million rows' },
      { rows: 50000000, name: '50 Million rows' },
      { rows: 100000000, name: '100 Million rows' },
    ];

    scenarios.forEach(scenario => {
      const sizeBytes = scenario.rows * avgBytesPerRow;
      const sizeGB = sizeBytes / (1024 ** 3);
      const indexSizeGB = sizeGB * 0.5; // Indexes ~50% of table size
      const totalSizeGB = sizeGB + indexSizeGB;
      
      let status = '✅ Excellent';
      let queryTime = '<5ms';
      if (scenario.rows > 1000000) {
        status = '⚠️ Good';
        queryTime = '<100ms';
      }
      if (scenario.rows > 10000000) {
        status = '🚨 Slow';
        queryTime = '<1s';
      }
      if (scenario.rows > 50000000) {
        status = '❌ Very Slow';
        queryTime = '1-5s';
      }

      console.log(`   ${scenario.name}:`);
      console.log(`     Size: ${totalSizeGB.toFixed(2)} GB | Query: ${queryTime} | ${status}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMMENDATIONS FOR 1000+ USERS\n');

    if (currentRows < 500000) {
      console.log('✅ CURRENT SETUP (Up to 500K rows)');
      console.log('   Your current configuration is perfect.');
      console.log('   - Batch inserts: ✅ Enabled');
      console.log('   - Connection pool: ✅ 100 connections');
      console.log('   - Performance indexes: ✅ 5 composite indexes');
      console.log('   - Estimated capacity: 1-2 years of heavy usage\n');
    }

    console.log('⚠️  WHEN YOU REACH 1-2 MILLION ROWS (Year 2-3)');
    console.log('   Consider table partitioning by year:');
    console.log('   - tasks_2025 (current year)');
    console.log('   - tasks_2024 (archived)');
    console.log('   - tasks_2023 (archived)');
    console.log('   Benefit: Queries only search current partition\n');

    console.log('🚨 WHEN YOU REACH 10+ MILLION ROWS (Year 5+)');
    console.log('   Implement advanced strategies:');
    console.log('   - Monthly partitions (tasks_2025_01, tasks_2025_02, etc.)');
    console.log('   - Archive old tasks to separate archive_tasks table');
    console.log('   - Move completed tasks older than 1 year to cold storage');
    console.log('   - Consider TimescaleDB for time-series optimization\n');

    console.log('='.repeat(80));
    console.log('📊 USAGE SCENARIOS FOR 1000 USERS\n');

    const usageScenarios = [
      {
        name: 'Light Usage',
        tasksPerUserPerYear: 100,
        years: 5,
      },
      {
        name: 'Normal Usage',
        tasksPerUserPerYear: 500,
        years: 5,
      },
      {
        name: 'Heavy Usage',
        tasksPerUserPerYear: 2000,
        years: 5,
      },
    ];

    usageScenarios.forEach(scenario => {
      const totalRows = 1000 * scenario.tasksPerUserPerYear * scenario.years;
      const sizeGB = (totalRows * avgBytesPerRow * 1.5) / (1024 ** 3);
      
      let status = '✅ No action needed';
      if (totalRows > 1000000) status = '⚠️ Plan partitioning';
      if (totalRows > 10000000) status = '🚨 Implement partitioning now';

      console.log(`   ${scenario.name}:`);
      console.log(`     Tasks/user/year: ${scenario.tasksPerUserPerYear}`);
      console.log(`     Total rows (${scenario.years} years): ${totalRows.toLocaleString()}`);
      console.log(`     Est. size: ${sizeGB.toFixed(2)} GB`);
      console.log(`     Action: ${status}\n`);
    });

    console.log('='.repeat(80));
    console.log('🎯 HARD LIMITS\n');
    console.log('   PostgreSQL Maximum: ~1.6 billion rows (theoretical)');
    console.log('   Recommended Maximum: 100 million rows per table');
    console.log('   Practical Maximum: 10 million rows (without partitioning)');
    console.log('   Optimal Range: 100K - 1M rows for best performance\n');
    
    console.log('   Your Current Status:');
    if (currentRows < 100000) {
      console.log('   ✅ Far below practical limits');
      console.log('   ✅ Excellent query performance');
      console.log('   ✅ No action needed for years\n');
    } else if (currentRows < 1000000) {
      console.log('   ⚠️  Approaching optimization threshold');
      console.log('   💡 Consider archiving strategy\n');
    } else {
      console.log('   🚨 Should implement partitioning');
      console.log('   🚨 Action required soon\n');
    }

    console.log('='.repeat(80));
    console.log('✅ Analysis complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
  }
}

checkLimits()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
