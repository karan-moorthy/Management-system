const { Pool } = require('pg');

async function check() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb'
  });

  const r = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='user_sessions'`);
  console.log(r.rows.length ? '✅ user_sessions exists' : '❌ user_sessions missing');
  
  if (r.rows.length === 0) {
    console.log('📦 Creating user_sessions table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_token text PRIMARY KEY NOT NULL,
        user_id uuid NOT NULL,
        expires timestamp NOT NULL
      );
    `);
    console.log('✅ user_sessions table created!');
  }

  await pool.end();
}

check();
