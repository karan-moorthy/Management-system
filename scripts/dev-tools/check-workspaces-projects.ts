import { config } from "dotenv";
import { db } from "../../src/db";
import { workspaces, projects } from "../../src/db/schema";
import { eq } from "drizzle-orm";

// Load environment variables
config({ path: ".env.local" });

async function checkWorkspacesAndProjects() {
  console.log("\n🔍 Checking all workspaces and their projects...\n");

  try {
    // Get all workspaces
    const allWorkspaces = await db
      .select()
      .from(workspaces);

    console.log(`📊 Found ${allWorkspaces.length} workspaces:\n`);

    for (const workspace of allWorkspaces) {
      console.log(`🏢 Workspace: ${workspace.name}`);
      console.log(`   ID: ${workspace.id}`);
      console.log(`   User ID: ${workspace.userId}`);

      // Get projects for this workspace
      const workspaceProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.workspaceId, workspace.id));

      if (workspaceProjects.length > 0) {
        console.log(`   📁 Projects (${workspaceProjects.length}):`);
        workspaceProjects.forEach((project) => {
          console.log(`      - ${project.name} (ID: ${project.id})`);
        });
      } else {
        console.log(`   ⚠️  No projects found in this workspace`);
      }
      console.log("");
    }

    console.log("\n✅ Workspace and project check complete!");
    console.log("\n💡 To upload CSV to a workspace:");
    console.log("   1. Navigate to /workspaces/[workspaceId]");
    console.log("   2. Make sure the workspace has at least one project");
    console.log("   3. Select the project from dropdown");
    console.log("   4. Upload your CSV file");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

checkWorkspacesAndProjects();
