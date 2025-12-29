const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('./src/db/schema.ts');

async function pushSchema() {
  const sql = postgres('postgresql://postgres:admin@localhost:5432/pmsdb', { max: 1 });
  const db = drizzle(sql, { schema });

  console.log('📦 Pushing schema to local database...');

  // Import the schema and create tables
  const fs = require('fs');
  const createTablesSql = fs.readFileSync('./drizzle/0000_shocking_dark_beast.sql', 'utf8');
  
  try {
    await sql.unsafe(createTablesSql);
    console.log('✅ Schema pushed successfully!');
  } catch (e) {
    console.log('⚠️  Some tables may already exist, continuing...');
  }

  await sql.end();
  process.exit(0);
}

pushSchema();
