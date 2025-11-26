/**
 * Fix Weekly Reports Table
 * Drops and recreates the table with the correct schema
 */
import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found");
  process.exit(1);
}

// Create database connection
const client = postgres(process.env.DATABASE_URL);

async function fixWeeklyReportsTable() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║       Fixing Weekly Reports Table                         ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Drop the old table
    console.log("🗑️  Dropping old weekly_reports table...");
    await client`DROP TABLE IF EXISTS weekly_reports CASCADE`;
    console.log("✅ Old table dropped\n");

    // Create the new table with correct schema
    console.log("🔨 Creating new weekly_reports table...");
    await client`
      CREATE TABLE weekly_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        from_date TIMESTAMP NOT NULL,
        to_date TIMESTAMP NOT NULL,
        department TEXT NOT NULL,
        daily_descriptions JSONB NOT NULL DEFAULT '{}',
        uploaded_files JSONB NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'submitted',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log("✅ New table created\n");

    // Create indexes
    console.log("📇 Creating indexes...");
    await client`CREATE INDEX weekly_reports_user_idx ON weekly_reports(user_id)`;
    await client`CREATE INDEX weekly_reports_department_idx ON weekly_reports(department)`;
    await client`CREATE INDEX weekly_reports_from_date_idx ON weekly_reports(from_date)`;
    await client`CREATE INDEX weekly_reports_to_date_idx ON weekly_reports(to_date)`;
    await client`CREATE INDEX weekly_reports_created_at_idx ON weekly_reports(created_at)`;
    console.log("✅ Indexes created\n");

    console.log("🎉 Weekly reports table fixed successfully!");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }

  await client.end();
  console.log("\n✨ Done!\n");
}

fixWeeklyReportsTable();
