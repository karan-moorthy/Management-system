import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1 });

async function addIsDraftColumn() {
  console.log('Adding is_draft column to weekly_reports table...');

  try {
    // Add the is_draft column
    await sql`
      ALTER TABLE "weekly_reports" 
      ADD COLUMN IF NOT EXISTS "is_draft" text DEFAULT 'false' NOT NULL
    `;
    console.log('✅ Added is_draft column');

    // Create index on is_draft
    await sql`
      CREATE INDEX IF NOT EXISTS "weekly_reports_is_draft_idx" 
      ON "weekly_reports" ("is_draft")
    `;
    console.log('✅ Created index on is_draft column');

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

addIsDraftColumn();
