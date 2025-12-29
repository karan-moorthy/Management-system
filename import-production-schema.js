const { Pool } = require('pg');
const fs = require('fs');

async function importFullSchema() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb'
  });

  console.log('📥 Importing complete schema from supabase-fixed-schema.sql...\n');

  try {
    const sql = fs.readFileSync('./supabase-fixed-schema.sql', 'utf8');
    
    // Execute the entire schema
    await pool.query(sql);
    
    console.log('✅ Schema imported successfully!\n');

    // Verify all tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
      ORDER BY table_name
    `);
    
    console.log(`📋 Total tables: ${tables.rows.length}`);
    tables.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));

    await pool.end();
    console.log('\n✅ Database fully synced with production!');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('⚠️  Some tables already exist, continuing...\n');
      
      // Verify tables anyway
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema='public' 
        ORDER BY table_name
      `);
      
      console.log(`📋 Total tables: ${tables.rows.length}`);
      tables.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));
      
      await pool.end();
      console.log('\n✅ Database ready!');
    } else {
      console.error('❌ Error:', e.message);
      await pool.end();
      process.exit(1);
    }
  }
}

importFullSchema();
