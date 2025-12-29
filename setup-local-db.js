const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { migrate } = require('drizzle-orm/postgres-js/migrator');

async function main() {
  const connectionString = 'postgresql://postgres:admin@localhost:5432/pmsdb';
  
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  console.log('Running migrations on local database...');
  
  await migrate(db, { migrationsFolder: './drizzle' });
  
  console.log('✅ Local database migrations completed!');
  
  await sql.end();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
