/**
 * Create Role-Based Test Users
 * 
 * Creates 5 users, one for each role, with descriptive emails
 * Perfect for testing the RBAC system
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from "drizzle-orm";
import bcrypt from 'bcryptjs';

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

interface RoleBasedUser {
  name: string;
  email: string;
  password: string;
  role: MemberRole;
  description: string;
}

const roleBasedUsers: RoleBasedUser[] = [
  {
    name: "Admin User",
    email: "admin@pms.com",
    password: "admin123",
    role: MemberRole.ADMIN,
    description: "Full system control - can do everything"
  },
  {
    name: "Project Manager",
    email: "pm@pms.com",
    password: "pm123",
    role: MemberRole.PROJECT_MANAGER,
    description: "Manages projects and teams"
  },
  {
    name: "Team Lead",
    email: "teamlead@pms.com",
    password: "teamlead123",
    role: MemberRole.TEAM_LEAD,
    description: "Leads team, manages own tasks"
  },
  {
    name: "Employee",
    email: "employee@pms.com",
    password: "employee123",
    role: MemberRole.EMPLOYEE,
    description: "Works on assigned tasks"
  },
  {
    name: "Management",
    email: "management@pms.com",
    password: "management123",
    role: MemberRole.MANAGEMENT,
    description: "Read-only access for reporting"
  }
];

async function createRoleBasedUsers() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║     Creating Role-Based Test Users for RBAC System       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Get existing workspaces
    const existingWorkspaces = await db.select().from(workspaces);
    
    if (existingWorkspaces.length === 0) {
      console.error("❌ No workspaces found. Please create at least one workspace first.");
      process.exit(1);
    }

    // Use the first workspace for testing
    const testWorkspace = existingWorkspaces[0];
    console.log(`📁 Using workspace: "${testWorkspace.name}" (${testWorkspace.id})\n`);

    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const userData of roleBasedUsers) {
      console.log(`\n👤 Processing: ${userData.name}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Role: ${userData.role}`);
      console.log(`   Description: ${userData.description}`);

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      let userId: string;

      if (existingUser.length > 0) {
        console.log(`   ⚠️  User already exists, updating password...`);
        userId = existingUser[0].id;
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Update password
        await db
          .update(users)
          .set({ password: hashedPassword })
          .where(eq(users.id, userId));
        
        updatedCount++;
      } else {
        console.log(`   ✨ Creating new user...`);
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Create user
        const [newUser] = await db
          .insert(users)
          .values({
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
          })
          .returning();
        
        userId = newUser.id;
        createdCount++;
      }

      // Check if member already exists in workspace
      const existingMember = await db
        .select()
        .from(members)
        .where(
          eq(members.userId, userId) && eq(members.workspaceId, testWorkspace.id)
        )
        .limit(1);

      if (existingMember.length > 0) {
        console.log(`   🔄 Updating member role to ${userData.role}...`);
        await db
          .update(members)
          .set({ role: userData.role })
          .where(eq(members.id, existingMember[0].id));
      } else {
        console.log(`   ➕ Adding to workspace as ${userData.role}...`);
        await db
          .insert(members)
          .values({
            userId: userId,
            workspaceId: testWorkspace.id,
            role: userData.role,
          });
      }

      console.log(`   ✅ Complete!`);
    }

    console.log("\n\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                    Summary                                ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    console.log(`  ✨ New users created: ${createdCount}`);
    console.log(`  🔄 Existing users updated: ${updatedCount}`);
    console.log(`  ⏭️  Users skipped: ${skippedCount}`);
    console.log(`  📁 Workspace: ${testWorkspace.name}`);

    console.log("\n\n╔════════════════════════════════════════════════════════════╗");
    console.log("║              🔐 Login Credentials                         ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    roleBasedUsers.forEach((user) => {
      const roleEmoji = getRoleEmoji(user.role);
      console.log(`  ${roleEmoji} ${user.role}`);
      console.log(`     Email:    ${user.email}`);
      console.log(`     Password: ${user.password}`);
      console.log(`     Purpose:  ${user.description}`);
      console.log(``);
    });

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                  How to Test                              ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");
    console.log(`  1. Go to: http://localhost:3000`);
    console.log(`  2. Login with any of the emails above`);
    console.log(`  3. Each user will have different capabilities:`);
    console.log(``);
    console.log(`     👑 admin@pms.com`);
    console.log(`        • Access all settings`);
    console.log(`        • Create/edit/delete projects`);
    console.log(`        • Manage all tasks`);
    console.log(`        • Manage members`);
    console.log(``);
    console.log(`     📊 pm@pms.com`);
    console.log(`        • Manage projects`);
    console.log(`        • Manage all tasks`);
    console.log(`        • Manage members`);
    console.log(`        • NO workspace settings`);
    console.log(``);
    console.log(`     🎯 teamlead@pms.com`);
    console.log(`        • Create/edit/delete own tasks`);
    console.log(`        • View all tasks`);
    console.log(`        • NO project management`);
    console.log(``);
    console.log(`     👷 employee@pms.com`);
    console.log(`        • Create/edit own tasks`);
    console.log(`        • Cannot delete tasks`);
    console.log(`        • View only`);
    console.log(``);
    console.log(`     📈 management@pms.com`);
    console.log(`        • View everything (read-only)`);
    console.log(`        • Cannot create/edit/delete anything`);
    console.log(``);

  } catch (error) {
    console.error("\n❌ Error creating users:", error);
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
    await createRoleBasedUsers();
    await client.end();
    console.log("\n✨ All done! Ready to test your RBAC system!\n");
  } catch (error) {
    console.error("\n❌ Script failed:", error);
    await client.end();
    process.exit(1);
  }
}

main();
