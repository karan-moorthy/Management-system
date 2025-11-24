import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from "../../src/db/index.js";
import { members, users, workspaces } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";

async function checkWorkspaceMembers() {
  try {
    console.log("\n🔍 Checking workspace members...\n");

    // Get all workspaces
    const allWorkspaces = await db.select().from(workspaces);
    console.log(`📦 Total workspaces: ${allWorkspaces.length}`);
    
    for (const workspace of allWorkspaces) {
      console.log(`\n📦 Workspace: ${workspace.name} (${workspace.id})`);
      
      // Get members of this workspace
      const workspaceMembers = await db
        .select({
          userId: members.userId,
          role: members.role,
          name: users.name,
          email: users.email,
        })
        .from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(eq(members.workspaceId, workspace.id));
      
      console.log(`  Members (${workspaceMembers.length}):`);
      workspaceMembers.forEach(m => {
        console.log(`    - ${m.name} (${m.email}) - ${m.role}`);
        console.log(`      User ID: ${m.userId}`);
      });
    }

    // Check the specific assignee
    const assigneeId = '0ed5aa56-f10a-46d5-8197-6e470166bdc6';
    console.log(`\n🔍 Checking assignee: ${assigneeId}`);
    
    const assigneeMemberships = await db
      .select({
        workspaceId: members.workspaceId,
        role: members.role,
        workspaceName: workspaces.name,
      })
      .from(members)
      .innerJoin(workspaces, eq(members.workspaceId, workspaces.id))
      .where(eq(members.userId, assigneeId));
    
    console.log(`  Found ${assigneeMemberships.length} workspace membership(s):`);
    assigneeMemberships.forEach(m => {
      console.log(`    - Workspace: ${m.workspaceName} (${m.workspaceId})`);
      console.log(`      Role: ${m.role}`);
    });

    console.log("\n✅ Check complete!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

checkWorkspaceMembers();
