import { db } from "@/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function runMigration() {
  try {
    console.log("Running list_view_columns migration...");
    
    const migrationSQL = fs.readFileSync(
      path.join(process.cwd(), "drizzle", "0024_add_list_view_columns.sql"),
      "utf-8"
    );
    
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      await db.execute(sql.raw(statement));
      console.log("✓ Executed statement");
    }
    
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
