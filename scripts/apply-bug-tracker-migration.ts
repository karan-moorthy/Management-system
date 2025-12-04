import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL!;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not defined in environment variables");
  console.error("Please check your .env.local file");
  process.exit(1);
}

async function main() {
  console.log("⏳ Applying bug tracker migration...");

  const sql = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  try {
    // Get the current directory
    const currentDir = process.cwd();
    
    // Read and execute the migration file
    const migrationPath = path.join(currentDir, "drizzle", "0018_add_bug_tracker.sql");
    
    console.log(`📁 Reading migration file from: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    console.log("📄 Executing migration SQL...");
    await sql.unsafe(migrationSQL);

    console.log("✅ Bug tracker migration applied successfully!");
    console.log("📊 Created tables:");
    console.log("  - custom_bug_types (with default types: UI/UX, Development, Testing)");
    console.log("  - bugs (bug tracking system)");
    console.log("📌 Created indexes for optimal performance");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

main();

