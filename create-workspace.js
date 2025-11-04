// Simple script to create a test workspace
import { db } from "./src/db/index.js";
import { users, workspaces, members } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

async function createTestWorkspace() {
  try {
    // Get the first user
    const userList = await db.select().from(users).limit(1);
    
    if (userList.length === 0) {
      console.log("No users found. Please register first.");
      return;
    }
    
    const user = userList[0];
    console.log("Found user:", user.email);
    
    // Check if workspace already exists
    const existingWorkspaces = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.userId, user.id));
    
    if (existingWorkspaces.length > 0) {
      console.log("User already has workspaces:", existingWorkspaces.length);
      console.log("First workspace ID:", existingWorkspaces[0].id);
      return;
    }
    
    // Create workspace
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: "My First Workspace",
        userId: user.id,
        imageUrl: null,
        inviteCode: Math.random().toString(36).substring(2, 15),
      })
      .returning();
    
    console.log("✅ Created workspace:", workspace.id);
    
    // Add user as admin member
    const [member] = await db
      .insert(members)
      .values({
        userId: user.id,
        workspaceId: workspace.id,
        role: "ADMIN",
      })
      .returning();
    
    console.log("✅ Added user as admin member");
    console.log("🚀 You can now visit: http://localhost:3000/workspaces/" + workspace.id);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

createTestWorkspace();