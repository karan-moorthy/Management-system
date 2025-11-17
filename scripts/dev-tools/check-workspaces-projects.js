const postgres = require('postgres');
require('dotenv/config');

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'pmsdb',
  username: 'postgres',
  password: 'admin'
});

async function checkWorkspacesAndProjects() {
  console.log("\n🔍 Checking all workspaces and their projects...\n");

  try {
    // Get all workspaces
    const allWorkspaces = await sql`
      SELECT id, name, user_id 
      FROM workspaces 
      ORDER BY name
    `;

    console.log(`📊 Found ${allWorkspaces.length} workspaces:\n`);

    for (const workspace of allWorkspaces) {
      console.log(`🏢 Workspace: ${workspace.name}`);
      console.log(`   ID: ${workspace.id}`);

      // Get projects for this workspace
      const workspaceProjects = await sql`
        SELECT id, name, image_url
        FROM projects
        WHERE workspace_id = ${workspace.id}
        ORDER BY name
      `;

      if (workspaceProjects.length > 0) {
        console.log(`   📁 Projects (${workspaceProjects.length}):`);
        workspaceProjects.forEach((project) => {
          console.log(`      ✓ ${project.name} (ID: ${project.id})`);
        });
      } else {
        console.log(`   ⚠️  No projects found - CREATE A PROJECT FIRST!`);
        console.log(`   💡 To create a project:`);
        console.log(`      1. Go to /workspaces/${workspace.id}`);
        console.log(`      2. Click "Create Project" button`);
      }
      console.log("");
    }

    console.log("\n✅ Workspace and project check complete!\n");
    console.log("💡 How to upload CSV to ANY workspace:");
    console.log("   1. Navigate to the workspace page: /workspaces/[workspace-id]");
    console.log("   2. Make sure the workspace has at least ONE project");
    console.log("   3. Select the project from the dropdown");
    console.log("   4. Upload your CSV file");
    console.log("\n📌 The upload works for ANY workspace and ANY project!");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sql.end();
  }
}

checkWorkspacesAndProjects();
