import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

async function applyMigration() {
  const sql = postgres(databaseUrl, { max: 1 });
  
  try {
    console.log('Applying migration: 0015_make_project_name_nullable.sql');
    
    const migrationPath = path.join(process.cwd(), 'drizzle', '0015_make_project_name_nullable.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
    
    await sql.unsafe(migrationSql);
    
    console.log('✅ Migration applied successfully!');
    
    // Verify the change
    const result = await sql`
      SELECT column_name, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'project_name'
    `;
    
    console.log('Verification:', result[0]);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyMigration();
