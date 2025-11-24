import { config } from "dotenv";
import path from "path";

// Load .env.local from project root
config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from "@/db";
import { notifications, members, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

async function checkNotifications() {
  try {
    console.log("\n📋 Checking notifications system...\n");

    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`👥 Total users: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });

    // Get all members with their roles
    console.log("\n👔 User roles in workspaces:");
    const allMembers = await db
      .select({
        userId: members.userId,
        workspaceId: members.workspaceId,
        role: members.role,
      })
      .from(members);
    
    for (const member of allMembers) {
      const user = allUsers.find(u => u.id === member.userId);
      console.log(`  - ${user?.name || 'Unknown'}: ${member.role} in workspace ${member.workspaceId}`);
    }

    // Get recent notifications
    console.log("\n🔔 Recent notifications (last 10):");
    const recentNotifications = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(10);

    if (recentNotifications.length === 0) {
      console.log("  ⚠️ No notifications found in database!");
    } else {
      recentNotifications.forEach(notif => {
        const user = allUsers.find(u => u.id === notif.userId);
        console.log(`  - [${notif.type}] for ${user?.name || 'Unknown'}: ${notif.title}`);
        console.log(`    Message: ${notif.message}`);
        console.log(`    Read: ${notif.isRead}, Created: ${notif.createdAt}`);
        console.log("");
      });
    }

    // Check for unread notifications per user
    console.log("\n📬 Unread notifications per user:");
    for (const user of allUsers) {
      const unreadNotifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt));
      
      const unreadCount = unreadNotifs.filter(n => n.isRead === "false").length;
      console.log(`  - ${user.name}: ${unreadCount} unread (${unreadNotifs.length} total)`);
    }

    console.log("\n✅ Notification check complete!\n");
  } catch (error) {
    console.error("❌ Error checking notifications:", error);
  } finally {
    process.exit(0);
  }
}

checkNotifications();
