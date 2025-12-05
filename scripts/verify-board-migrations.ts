import "dotenv/config";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString);

async function verifyMigrations() {
  try {
    console.log("🔍 Checking parent_task_id column...");
    const parentTaskColumn = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'parent_task_id'
    `;
    console.log("✅ Parent task column:", parentTaskColumn.length > 0 ? "EXISTS" : "NOT FOUND");

    console.log("\n🔍 Checking board_columns table...");
    const boardColumnsTable = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'board_columns'
    `;
    console.log("✅ Board columns table:", boardColumnsTable.length > 0 ? "EXISTS" : "NOT FOUND");

    console.log("\n🔍 Fetching board columns data...");
    const columns = await sql`
      SELECT id, workspace_id, name, position, category, is_default
      FROM board_columns
      ORDER BY workspace_id, position
      LIMIT 10
    `;
    console.log(`✅ Found ${columns.length} board columns`);
    columns.forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col.name} (${col.category}) - Position: ${col.position} - Default: ${col.is_default}`);
    });

    await sql.end();
    console.log("\n✨ Verification complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error verifying migrations:", error);
    await sql.end();
    process.exit(1);
  }
}

verifyMigrations();
