import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from "../../src/db/index.js";
import { notifications, members, users, tasks } from "../../src/db/schema.js";
import { eq, desc } from "drizzle-orm";

async function checkActivity() {
  try {
    console.log("\n🔍 Checking recent database activity...\n");

    // Check recent notifications
    const recentNotifications = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(5);
    
    console.log("📬 Recent notifications:");
    if (recentNotifications.length === 0) {
      console.log("  ❌ No notifications found!");
    } else {
      recentNotifications.forEach((n) => {
        console.log(`  - [${n.type}] ${n.title} for user ${n.userId}`);
        console.log(`    Message: ${n.message}`);
        console.log(`    Read: ${n.isRead}, Created: ${n.createdAt}`);
        console.log("");
      });
    }

    // Check users and their roles
    const adminMembers = await db
      .select({
        userId: members.userId,
        role: members.role,
        workspaceId: members.workspaceId,
        name: users.name,
        email: users.email,
      })
      .from(members)
      .innerJoin(users, eq(members.userId, users.id))
      .where(eq(members.role, "ADMIN"));

    console.log("\n👔 Admin users:");
    adminMembers.forEach((m) => {
      console.log(`  - ${m.name} (${m.email}) - ${m.role} in workspace ${m.workspaceId}`);
    });

    // Check recent task updates
    const inReviewTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.status, "IN_REVIEW"))
      .orderBy(desc(tasks.updated))
      .limit(5);

    console.log("\n📋 Tasks currently IN_REVIEW:");
    if (inReviewTasks.length === 0) {
      console.log("  ❌ No tasks in IN_REVIEW status");
    } else {
      inReviewTasks.forEach((t) => {
        console.log(`  - ${t.issueId}: ${t.summary}`);
        console.log(`    Workspace: ${t.workspaceId}, Assignee: ${t.assigneeId}`);
        console.log(`    Updated: ${t.updated}`);
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

checkActivity();
