/**
 * Add all users to workspace
 * This script adds all users who don't have a workspace membership to the main workspace
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, notInArray } from "drizzle-orm";

// Load environment variables
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found");
  process.exit(1);
}

// Create database connection
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

import { users, members, workspaces } from "@/db/schema";

async function addAllUsersToWorkspace() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║        Add All Users to Workspace                         ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Get the main workspace (first one or the one with admin)
    const [workspace] = await db
      .select()
      .from(workspaces)
      .limit(1);

    if (!workspace) {
      console.error("❌ No workspace found! Please create a workspace first.");
      process.exit(1);
    }

    console.log(`📁 Using workspace: ${workspace.name} (${workspace.id})\n`);

    // Get existing members in this workspace
    const existingMembers = await db
      .select({ userId: members.userId })
      .from(members)
      .where(eq(members.workspaceId, workspace.id));

    const existingUserIds = existingMembers.map(m => m.userId);
    console.log(`✅ Current members: ${existingUserIds.length}`);

    // Get all users who are NOT in this workspace
    let usersToAdd;
    if (existingUserIds.length > 0) {
      usersToAdd = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(notInArray(users.id, existingUserIds));
    } else {
      // If no existing members, add all users
      usersToAdd = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users);
    }

    if (usersToAdd.length === 0) {
      console.log("\n✨ All users are already members of this workspace!");
      await client.end();
      return;
    }

    console.log(`\n📋 Users to add (${usersToAdd.length}):`);
    console.table(usersToAdd);

    // Add all users as EMPLOYEE role
    const newMembers = usersToAdd.map(user => ({
      userId: user.id,
      workspaceId: workspace.id,
      role: "EMPLOYEE" as const,
    }));

    await db.insert(members).values(newMembers);

    console.log(`\n✅ Successfully added ${newMembers.length} users to workspace!`);
    console.log("\n🎉 All users can now login and access the system.\n");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }

  await client.end();
}

addAllUsersToWorkspace();
