import "dotenv/config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function runMigrations() {
  try {
    console.log("🔄 Running migrations for parent_task_id and board_columns...");

    // Migration 1: Add parent_task_id
    const migration1 = fs.readFileSync(
      path.join(process.cwd(), "drizzle", "0022_add_parent_task_id.sql"),
      "utf-8"
    );

    const statements1 = migration1
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements1) {
      await db.execute(sql.raw(statement));
    }

    console.log("✅ Migration 1: parent_task_id added successfully!");

    // Migration 2: Create board_columns
    const migration2 = fs.readFileSync(
      path.join(process.cwd(), "drizzle", "0023_create_board_columns.sql"),
      "utf-8"
    );

    const statements2 = migration2
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements2) {
      await db.execute(sql.raw(statement));
    }

    console.log("✅ Migration 2: board_columns table created successfully!");
    console.log("✨ All migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
