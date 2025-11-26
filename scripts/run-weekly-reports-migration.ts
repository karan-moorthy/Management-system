/**
 * Run Weekly Reports Migration
 */
import { config } from 'dotenv';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found");
  process.exit(1);
}

// Create database connection
const client = postgres(process.env.DATABASE_URL);

async function runMigration() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║       Running Weekly Reports Migration                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Read the SQL migration file
    const migrationPath = join(process.cwd(), 'drizzle', '0017_add_weekly_reports_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log("📄 Executing migration SQL...\n");
    
    // Execute the migration
    await client.unsafe(migrationSQL);

    console.log("✅ Weekly reports table created successfully!\n");

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log("ℹ️  Table already exists, skipping migration.\n");
    } else {
      console.error("\n❌ Migration failed:", error);
      process.exit(1);
    }
  }

  await client.end();
  console.log("✨ Migration complete!\n");
}

runMigration();
