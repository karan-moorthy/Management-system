import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql);

async function applyMigration() {
  try {
    console.log('🚀 Applying activity_logs migration...');
    
    const migrationPath = path.join(process.cwd(), 'drizzle', '0014_add_activity_logs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Activity logs table created successfully!');
    console.log('✅ All indexes created');
    
    // Verify the table was created
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'activity_logs'
    `;
    
    if (result[0].count === '1') {
      console.log('✅ Verification passed: activity_logs table exists');
    } else {
      console.error('❌ Verification failed: activity_logs table not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyMigration();
