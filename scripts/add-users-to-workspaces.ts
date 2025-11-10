/**
 * Add All Role-Based Users to All Workspaces
 * 
 * This ensures all test users (admin, pm, teamlead, employee, management)
 * are members of all workspaces so you can test their access levels
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from "drizzle-orm";

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
import { MemberRole } from "@/features/members/types";

const roleBasedEmails = [
  { email: "admin@pms.com", role: MemberRole.ADMIN },
  { email: "pm@pms.com", role: MemberRole.PROJECT_MANAGER },
  { email: "teamlead@pms.com", role: MemberRole.TEAM_LEAD },
  { email: "employee@pms.com", role: MemberRole.EMPLOYEE },
  { email: "management@pms.com", role: MemberRole.MANAGEMENT },
];

async function addUsersToAllWorkspaces() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   Adding Role-Based Users to All Workspaces              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Get all workspaces
    const allWorkspaces = await db.select().from(workspaces);
    
    if (allWorkspaces.length === 0) {
      console.error("❌ No workspaces found!");
      process.exit(1);
    }

    console.log(`📁 Found ${allWorkspaces.length} workspace(s):\n`);
    allWorkspaces.forEach((ws, idx) => {
      console.log(`   ${idx + 1}. ${ws.name} (${ws.id})`);
    });
    console.log("");

    // Get all role-based users
    const emailList = roleBasedEmails.map(r => r.email);
    const allUsers = await db
      .select()
      .from(users);
    
    const roleUsers = allUsers.filter(u => emailList.includes(u.email));

    if (roleUsers.length === 0) {
      console.error("❌ No role-based users found. Please run: npm run create:role-users");
      process.exit(1);
    }

    console.log(`👥 Found ${roleUsers.length} role-based user(s)\n`);

    let addedCount = 0;
    let existingCount = 0;
    let updatedCount = 0;

    // For each workspace, add all users with their respective roles
    for (const workspace of allWorkspaces) {
      console.log(`\n📁 Processing workspace: "${workspace.name}"`);
      console.log("═".repeat(60));

      for (const userEmail of roleBasedEmails) {
        const user = roleUsers.find(u => u.email === userEmail.email);
        
        if (!user) {
          console.log(`   ⚠️  User ${userEmail.email} not found, skipping...`);
          continue;
        }

        const roleEmoji = getRoleEmoji(userEmail.role);
        console.log(`   ${roleEmoji} ${user.name} (${userEmail.role})`);

        // Check if user is already a member
        const existingMember = await db
          .select()
          .from(members)
          .where(
            and(
              eq(members.userId, user.id),
              eq(members.workspaceId, workspace.id)
            )
          )
          .limit(1);

        if (existingMember.length > 0) {
          // Update role if different
          if (existingMember[0].role !== userEmail.role) {
            await db
              .update(members)
              .set({ role: userEmail.role })
              .where(eq(members.id, existingMember[0].id));
            console.log(`      🔄 Updated role to ${userEmail.role}`);
            updatedCount++;
          } else {
            console.log(`      ✓ Already a member with correct role`);
            existingCount++;
          }
        } else {
          // Add as new member
          await db
            .insert(members)
            .values({
              userId: user.id,
              workspaceId: workspace.id,
              role: userEmail.role,
            });
          console.log(`      ➕ Added as ${userEmail.role}`);
          addedCount++;
        }
      }
    }

    console.log("\n\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                       Summary                             ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    console.log(`  ✨ New memberships added: ${addedCount}`);
    console.log(`  🔄 Roles updated: ${updatedCount}`);
    console.log(`  ✓  Already existing: ${existingCount}`);
    console.log(`  📁 Workspaces processed: ${allWorkspaces.length}`);

    console.log("\n\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                  What You Can Test Now                    ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    allWorkspaces.forEach((ws) => {
      console.log(`  📁 Workspace: "${ws.name}"`);
      console.log(`     All 5 role-based users can now access this workspace`);
      console.log(``);
    });

    console.log("  Login as different users and switch to any workspace:");
    console.log("  • admin@pms.com → Can manage everything");
    console.log("  • pm@pms.com → Can manage projects & tasks");
    console.log("  • teamlead@pms.com → Can manage own tasks");
    console.log("  • employee@pms.com → Can work on tasks");
    console.log("  • management@pms.com → Can view everything (read-only)");
    console.log("");

  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  }
}

function getRoleEmoji(role: string): string {
  const emojiMap: Record<string, string> = {
    'ADMIN': '👑',
    'PROJECT_MANAGER': '📊',
    'TEAM_LEAD': '🎯',
    'EMPLOYEE': '👷',
    'MANAGEMENT': '📈',
  };
  return emojiMap[role] || '❓';
}

async function main() {
  try {
    await addUsersToAllWorkspaces();
    await client.end();
    console.log("✨ Done! All users can now access all workspaces!\n");
  } catch (error) {
    console.error("\n❌ Script failed:", error);
    await client.end();
    process.exit(1);
  }
}

main();
