const postgres = require('postgres');
require('dotenv/config');

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'pmsdb',
  username: 'postgres',
  password: 'admin'
});

async function addUserToWorkspaces() {
  console.log("\n🔧 Adding user to all workspaces...\n");

  try {
    // Get the main user (you)
    const [user] = await sql`
      SELECT id, email, name
      FROM users
      WHERE email = 'mlkaran2004@gmail.com'
      LIMIT 1
    `;

    if (!user) {
      console.log("❌ User mlkaran2004@gmail.com not found!");
      return;
    }

    console.log(`👤 User found: ${user.name} (${user.email})\n`);

    // Get all workspaces
    const workspaces = await sql`
      SELECT id, name
      FROM workspaces
      ORDER BY name
    `;

    for (const workspace of workspaces) {
      // Check if already a member
      const existingMember = await sql`
        SELECT id
        FROM members
        WHERE workspace_id = ${workspace.id}
        AND user_id = ${user.id}
      `;

      if (existingMember.length > 0) {
        console.log(`✅ Already a member of: ${workspace.name}`);
      } else {
        // Add as member
        await sql`
          INSERT INTO members (workspace_id, user_id, role)
          VALUES (${workspace.id}, ${user.id}, 'ADMIN')
        `;
        console.log(`➕ Added to workspace: ${workspace.name} (as ADMIN)`);
      }
    }

    console.log("\n✅ User membership updated!");
    console.log("\n💡 Now you can upload CSV to ANY project in ANY workspace!");
    console.log("   Just refresh your browser and try again.");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sql.end();
  }
}

addUserToWorkspaces();
