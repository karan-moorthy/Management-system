/**
 * Test Activity Logging Integration
 * 
 * This script tests the activity logging system by:
 * 1. Checking if activity_logs table exists
 * 2. Querying recent activity logs
 * 3. Displaying summary of logged activities
 */

import "../dotenv-config";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { desc } from "drizzle-orm";

async function testActivityLogging() {
  console.log("🔍 Testing Activity Logging System...\n");

  try {
    // Check if table exists and fetch recent logs
    const recentLogs = await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(20);

    console.log("✅ Activity logs table is accessible\n");
    console.log(`📊 Found ${recentLogs.length} recent activity logs\n`);

    if (recentLogs.length > 0) {
      console.log("Recent Activities:");
      console.log("─".repeat(80));
      
      recentLogs.forEach((log, index) => {
        const timeAgo = getTimeAgo(new Date(log.createdAt));
        console.log(`${index + 1}. [${log.actionType}] ${log.summary}`);
        console.log(`   User: ${log.userName} | ${timeAgo}`);
        if (log.changes) {
          console.log(`   Changes: ${JSON.stringify(log.changes)}`);
        }
        console.log("─".repeat(80));
      });
    } else {
      console.log("⚠️  No activity logs found yet.");
      console.log("\nTo test the system:");
      console.log("1. Create a new task in the application");
      console.log("2. Update a task (change status, assignee, etc.)");
      console.log("3. Drag a task to a different column");
      console.log("4. Delete a task");
      console.log("\nThen run this script again to see the logged activities.");
    }

    // Show activity type breakdown
    const activityTypes = new Map<string, number>();
    recentLogs.forEach(log => {
      activityTypes.set(log.actionType, (activityTypes.get(log.actionType) || 0) + 1);
    });

    if (activityTypes.size > 0) {
      console.log("\n📈 Activity Type Breakdown:");
      activityTypes.forEach((count, type) => {
        console.log(`   ${type}: ${count}`);
      });
    }

    console.log("\n✅ Activity logging test completed!");

  } catch (error) {
    console.error("❌ Error testing activity logging:", error);
    process.exit(1);
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

testActivityLogging()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
