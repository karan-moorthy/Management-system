const { Pool } = require('pg');

async function fixUserColumns() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb'
  });

  console.log('🔧 Adding missing columns to users table...');

  const columns = [
    { name: 'date_of_birth', type: 'timestamp' },
    { name: 'native', type: 'text' },
    { name: 'mobile_no', type: 'text' },
    { name: 'designation', type: 'text' },
    { name: 'department', type: 'text' },
    { name: 'experience', type: 'text' },
    { name: 'date_of_joining', type: 'timestamp' },
    { name: 'skills', type: 'text' }
  ];

  for (const col of columns) {
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      console.log(`✅ Added column: ${col.name}`);
    } catch (e) {
      console.log(`⚠️  Column ${col.name} might already exist`);
    }
  }

  console.log('✅ Users table updated!');
  await pool.end();
}

fixUserColumns();
