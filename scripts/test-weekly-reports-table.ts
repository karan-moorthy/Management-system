/**
 * Test Weekly Reports Table
 */
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Load environment variables
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found");
  process.exit(1);
}

// Create database connection
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

import { weeklyReports } from "@/db/schema";

async function testWeeklyReportsTable() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║       Testing Weekly Reports Table                        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    const reports = await db.select().from(weeklyReports);
    console.log(`✅ Weekly reports table exists!`);
    console.log(`📊 Current count: ${reports.length} reports\n`);

    if (reports.length > 0) {
      console.log("Sample report:");
      console.table(reports[0]);
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }

  await client.end();
  console.log("✨ Test complete!\n");
}

testWeeklyReportsTable();
