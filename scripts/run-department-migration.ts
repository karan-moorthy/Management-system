import { config } from 'dotenv';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

async function migrate() {
  try {
    console.log('🚀 Running migration: 0014_add_custom_departments.sql');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../drizzle/0014_add_custom_departments.sql'),
      'utf-8'
    );
    
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
