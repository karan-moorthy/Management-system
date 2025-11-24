import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(process.cwd(), '.env.local') });

import { db } from "../../src/db/index.js";
import { members } from "../../src/db/schema.js";

async function addUserToWorkspace() {
  try {
    const userId = '0ed5aa56-f10a-46d5-8197-6e470166bdc6'; // Karthikeyan
    const workspaceId = 'f74a8ccf-6039-49bd-b1b1-076c334fc3d3'; // Default Workspace
    const role = 'MEMBER'; // Regular member role

    console.log("\n➕ Adding user to workspace...");
    console.log(`User ID: ${userId}`);
    console.log(`Workspace ID: ${workspaceId}`);
    console.log(`Role: ${role}\n`);

    const [newMember] = await db
      .insert(members)
      .values({
        userId,
        workspaceId,
        role,
      })
      .returning();

    console.log("✅ User added to workspace successfully!");
    console.log("Member details:", newMember);
    console.log("\n✨ Now notifications should work!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

addUserToWorkspace();
