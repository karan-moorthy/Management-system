/**
 * Member Role Management Script
 * 
 * Purpose: View and update member roles in the RBAC system
 * 
 * Usage:
 *   npm run manage:roles -- view              # View all members and roles
 *   npm run manage:roles -- update <memberId> <newRole>  # Update a member's role
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from "drizzle-orm";

// Load environment variables
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL not found");
  process.exit(1);
}

// Create database connection
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

import { members, users, workspaces } from "@/db/schema";
import { MemberRole } from "@/features/members/types";

interface MemberWithDetails {
  memberId: string;
  userId: string;
  userName: string;
  userEmail: string;
  workspaceId: string;
  workspaceName: string;
  role: string;
}

async function viewAllMembers() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║            Current Member Roles Overview                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Get all members with user and workspace details
    const allMembers = await db
      .select({
        memberId: members.id,
        userId: members.userId,
        workspaceId: members.workspaceId,
        role: members.role,
        userName: users.name,
        userEmail: users.email,
        workspaceName: workspaces.name,
      })
      .from(members)
      .leftJoin(users, eq(members.userId, users.id))
      .leftJoin(workspaces, eq(members.workspaceId, workspaces.id))
      .orderBy(workspaces.name, members.role);

    // Group by workspace
    const byWorkspace = allMembers.reduce((acc, member) => {
      const ws = member.workspaceName || 'Unknown';
      if (!acc[ws]) acc[ws] = [];
      acc[ws].push(member);
      return acc;
    }, {} as Record<string, typeof allMembers>);

    // Display by workspace
    let totalMembers = 0;
    Object.entries(byWorkspace).forEach(([workspaceName, members]) => {
      console.log(`\n📁 Workspace: ${workspaceName}`);
      console.log("═".repeat(60));
      
      members.forEach((member, idx) => {
        totalMembers++;
        const roleEmoji = getRoleEmoji(member.role);
        console.log(`  ${idx + 1}. ${roleEmoji} ${member.role}`);
        console.log(`     👤 ${member.userName} (${member.userEmail})`);
        console.log(`     🆔 Member ID: ${member.memberId}`);
        console.log("");
      });
    });

    // Role distribution summary
    console.log("\n📊 Role Distribution Summary:");
    console.log("═".repeat(60));
    const roleStats = allMembers.reduce((acc, member) => {
      const role = member.role || 'UNKNOWN';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(roleStats)
      .sort(([, a], [, b]) => b - a)
      .forEach(([role, count]) => {
        const emoji = getRoleEmoji(role);
        const percentage = ((count / totalMembers) * 100).toFixed(1);
        console.log(`  ${emoji} ${role.padEnd(20)} ${count} (${percentage}%)`);
      });

    console.log(`\n  Total Members: ${totalMembers}`);
    console.log("═".repeat(60));

    // Suggestions
    console.log("\n💡 Role Assignment Suggestions:");
    console.log("  • ADMIN: Full system control (workspace/project settings)");
    console.log("  • PROJECT_MANAGER: Manage projects, tasks, and team members");
    console.log("  • TEAM_LEAD: Create/edit/delete own tasks, view team tasks");
    console.log("  • EMPLOYEE: Create/edit own tasks, view all tasks");
    console.log("  • MANAGEMENT: Read-only access to all data\n");

  } catch (error) {
    console.error("❌ Error fetching members:", error);
    throw error;
  }
}

async function updateMemberRole(memberId: string, newRole: string) {
  console.log(`\n🔄 Updating member role...`);
  console.log(`   Member ID: ${memberId}`);
  console.log(`   New Role: ${newRole}\n`);

  // Validate role
  const validRoles = [
    MemberRole.ADMIN,
    MemberRole.PROJECT_MANAGER,
    MemberRole.TEAM_LEAD,
    MemberRole.EMPLOYEE,
    MemberRole.MANAGEMENT
  ];
  const validRoleStrings = Object.values(MemberRole);
  if (!validRoleStrings.includes(newRole as MemberRole)) {
    console.error(`❌ Invalid role: ${newRole}`);
    console.error(`   Valid roles: ${validRoleStrings.join(', ')}`);
    process.exit(1);
  }

  try {
    // Get member details before update
    const beforeUpdate = await db
      .select({
        memberId: members.id,
        role: members.role,
        userName: users.name,
        userEmail: users.email,
        workspaceName: workspaces.name,
      })
      .from(members)
      .leftJoin(users, eq(members.userId, users.id))
      .leftJoin(workspaces, eq(members.workspaceId, workspaces.id))
      .where(eq(members.id, memberId))
      .limit(1);

    if (beforeUpdate.length === 0) {
      console.error(`❌ Member not found with ID: ${memberId}`);
      process.exit(1);
    }

    const member = beforeUpdate[0];
    console.log(`📋 Current Details:`);
    console.log(`   User: ${member.userName} (${member.userEmail})`);
    console.log(`   Workspace: ${member.workspaceName}`);
    console.log(`   Current Role: ${member.role}`);
    console.log(`   New Role: ${newRole}\n`);

    // Update the role
    await db
      .update(members)
      .set({ role: newRole as MemberRole })
      .where(eq(members.id, memberId));

    console.log(`✅ Role updated successfully!`);
    console.log(`   ${member.userName} is now a ${newRole} in ${member.workspaceName}\n`);

  } catch (error) {
    console.error("❌ Error updating role:", error);
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
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'view' || !command) {
      await viewAllMembers();
    } else if (command === 'update') {
      const memberId = args[1];
      const newRole = args[2];

      if (!memberId || !newRole) {
        console.error("❌ Usage: npm run manage:roles -- update <memberId> <newRole>");
        console.error("   Example: npm run manage:roles -- update abc123 PROJECT_MANAGER");
        process.exit(1);
      }

      await updateMemberRole(memberId, newRole);
    } else {
      console.error(`❌ Unknown command: ${command}`);
      console.error("   Available commands: view, update");
      process.exit(1);
    }

    await client.end();
    console.log("✨ Done!\n");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    await client.end();
    process.exit(1);
  }
}

main();
