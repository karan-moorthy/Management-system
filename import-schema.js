const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function importSQL() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb'
  });

  console.log('📥 Importing initial schema...');
  const sql = fs.readFileSync(path.join(__dirname, 'drizzle', '0000_shocking_dark_beast.sql'), 'utf8');
  
  try {
    await pool.query(sql);
    console.log('✅ Initial schema imported!');
  } catch (e) {
    console.error('❌ Error:', e.message);
  }

  await pool.end();
}

importSQL().then(() => process.exit(0));
