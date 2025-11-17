const { config } = require('dotenv');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { sql } = require('drizzle-orm');

config({ path: '.env.local' });

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function addUploadTracking() {
  try {
    console.log('\n📦 Adding upload tracking columns to tasks table...\n');
    
    // Add columns safely
    await db.execute(sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS upload_batch_id uuid`);
    await db.execute(sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS uploaded_at timestamp`);
    await db.execute(sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS uploaded_by uuid`);
    
    // Add foreign key if not exists
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'tasks_uploaded_by_users_id_fk'
        ) THEN
          ALTER TABLE tasks 
          ADD CONSTRAINT tasks_uploaded_by_users_id_fk 
          FOREIGN KEY (uploaded_by) REFERENCES users(id);
        END IF;
      END $$;
    `);
    
    // Add index if not exists
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS tasks_upload_batch_idx 
      ON tasks (upload_batch_id)
    `);
    
    console.log('✅ Successfully added upload tracking columns!');
    console.log('   - upload_batch_id (UUID)');
    console.log('   - uploaded_at (timestamp)');
    console.log('   - uploaded_by (UUID -> users.id)');
    console.log('   - Index on upload_batch_id\n');
    
    await client.end();
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

addUploadTracking();
