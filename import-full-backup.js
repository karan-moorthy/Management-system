const { Pool } = require('pg');
const fs = require('fs');

async function importFullBackup() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb'
  });

  console.log('📥 Importing full backup.sql...');

  const sql = fs.readFileSync('./backup.sql', 'utf8');
  
  // Split into individual statements and execute
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    try {
      await pool.query(statement);
      successCount++;
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log(`⚠️  ${e.message.split('\n')[0]}`);
        errorCount++;
      }
    }
  }

  console.log(`✅ Imported ${successCount} statements (${errorCount} errors - mostly duplicates)`);
  
  // Verify tables
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema='public' 
    ORDER BY table_name
  `);
  
  console.log(`\n📋 Total tables: ${tables.rows.length}`);
  tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

  await pool.end();
}

importFullBackup().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
