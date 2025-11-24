import "dotenv/config";
import { db } from "../../src/db";
import { notifications } from "../../src/db/schema";
import { desc } from "drizzle-orm";

async function checkNotificationTimestamps() {
  try {
    console.log("📋 Checking notification timestamps...\n");

    const allNotifications = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(10);

    console.log(`Total notifications (last 10): ${allNotifications.length}\n`);

    allNotifications.forEach((notif, index) => {
      console.log(`📝 Notification ${index + 1}:`);
      console.log(`   ID: ${notif.id}`);
      console.log(`   Title: ${notif.title}`);
      console.log(`   Type: ${notif.type}`);
      console.log(`   Created At (DB): ${notif.createdAt}`);
      console.log(`   Created At (ISO): ${notif.createdAt?.toISOString()}`);
      console.log(`   Created At (Local): ${notif.createdAt?.toLocaleString()}`);
      console.log(`   Current Time: ${new Date().toISOString()}`);
      
      if (notif.createdAt) {
        const now = new Date();
        const diff = now.getTime() - new Date(notif.createdAt).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        console.log(`   Time Difference: ${minutes} minutes (${hours} hours)`);
      }
      console.log("");
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkNotificationTimestamps();
