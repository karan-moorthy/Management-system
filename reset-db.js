const { Pool } = require('pg');

async function setup() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:admin@localhost:5432/postgres'
  });

  await pool.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='pmsdb'");
  await pool.query('DROP DATABASE IF EXISTS pmsdb');
  await pool.query('CREATE DATABASE pmsdb');
  console.log('✅ Fresh database created');
  await pool.end();
}

setup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
