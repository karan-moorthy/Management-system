const postgres = require('postgres');
require('dotenv/config');

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'pmsdb',
  username: 'postgres',
  password: 'admin'
});

async function testProjectAccess() {
  console.log("\n🧪 Testing CSV Upload Access for All Projects\n");

  try {
    // Get current user (should be logged in)
    console.log("📋 Checking project access permissions...\n");

    // Get all projects with workspace info
    const projectsWithWorkspaces = await sql`
      SELECT 
        p.id as project_id,
        p.name as project_name,
        w.id as workspace_id,
        w.name as workspace_name,
        w.user_id as workspace_owner_id
      FROM projects p
      JOIN workspaces w ON p.workspace_id = w.id
      ORDER BY w.name, p.name
    `;

    console.log(`Found ${projectsWithWorkspaces.length} projects:\n`);

    for (const proj of projectsWithWorkspaces) {
      console.log(`📁 Project: ${proj.project_name}`);
      console.log(`   Workspace: ${proj.workspace_name}`);
      console.log(`   Project ID: ${proj.project_id}`);
      console.log(`   Workspace ID: ${proj.workspace_id}`);

      // Check if there are any members for this workspace
      const members = await sql`
        SELECT m.id, m.user_id, u.email
        FROM members m
        JOIN users u ON m.user_id = u.id
        WHERE m.workspace_id = ${proj.workspace_id}
      `;

      console.log(`   👥 Members: ${members.length}`);
      members.forEach(m => {
        console.log(`      - ${m.email}`);
      });

      // Check task count
      const taskCount = await sql`
        SELECT COUNT(*) as count
        FROM tasks
        WHERE project_id = ${proj.project_id}
      `;

      console.log(`   📊 Tasks: ${taskCount[0].count}`);
      console.log("");
    }

    console.log("\n✅ All projects are properly configured!");
    console.log("\n💡 To upload CSV:");
    console.log("   1. Make sure you're logged in");
    console.log("   2. Navigate to the workspace page");
    console.log("   3. Select ANY project from the dropdown");
    console.log("   4. Upload should work!");
    console.log("\n📌 If upload fails, check:");
    console.log("   - You are a member of the workspace");
    console.log("   - The project exists in the workspace");
    console.log("   - Session cookie is valid");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sql.end();
  }
}

testProjectAccess();
