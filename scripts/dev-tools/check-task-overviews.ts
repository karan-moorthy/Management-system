import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from "../../src/db/index.js";
import { taskOverviews } from "../../src/db/schema.js";
import { desc } from "drizzle-orm";

async function checkTaskOverviews() {
  try {
    console.log("\n🔍 Checking task overviews...\n");

    const allOverviews = await db
      .select()
      .from(taskOverviews)
      .orderBy(desc(taskOverviews.createdAt))
      .limit(10);

    console.log(`📋 Total task overviews found: ${allOverviews.length}\n`);

    if (allOverviews.length === 0) {
      console.log("❌ No task overviews found in database!");
    } else {
      allOverviews.forEach((overview) => {
        console.log(`📝 Overview ID: ${overview.id}`);
        console.log(`   Task: ${overview.taskTitle} (${overview.taskId})`);
        console.log(`   Employee: ${overview.employeeName}`);
        console.log(`   Status: ${overview.status}`);
        console.log(`   Submitted: ${overview.createdAt}`);
        console.log(`   Description: ${overview.completedWorkDescription?.substring(0, 50)}...`);
        console.log("");
      });
    }

    console.log("✅ Check complete!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

checkTaskOverviews();
