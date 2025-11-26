import "dotenv/config";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function applyAutoCompletedStatusMigration() {
  console.log("Starting AUTO_COMPLETED status migration...");

  try {
    // Update existing auto-ended records
    const result = await client`
      UPDATE attendance 
      SET status = 'AUTO_COMPLETED' 
      WHERE status = 'COMPLETED' 
      AND end_activity LIKE '%automatically ended at midnight%'
    `;

    console.log(`✓ Successfully updated records to AUTO_COMPLETED status`);
    console.log(`  Rows affected: ${result.count}`);
    console.log("\n✓ Migration completed successfully!");
    
    await client.end();
  } catch (error) {
    console.error("✗ Migration failed:", error);
    await client.end();
    throw error;
  }
}

applyAutoCompletedStatusMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
