const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function addVarunUser() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb'
  });

  try {
    console.log('👤 Creating varun@pms.com with admin access...\n');

    // Check if user exists
    const existingUser = await pool.query(`SELECT id FROM users WHERE email='varun@pms.com'`);
    
    if (existingUser.rows.length > 0) {
      console.log('✅ User varun@pms.com already exists');
      const userId = existingUser.rows[0].id;
      
      // Check if they're in a workspace
      const memberCheck = await pool.query(`SELECT id, role FROM members WHERE user_id=$1`, [userId]);
      
      if (memberCheck.rows.length > 0) {
        console.log(`✅ Already a member with role: ${memberCheck.rows[0].role}`);
      } else {
        // Add to workspace
        const workspace = await pool.query(`SELECT id FROM workspaces LIMIT 1`);
        if (workspace.rows.length > 0) {
          await pool.query(`
            INSERT INTO members (user_id, workspace_id, role, created_at, updated_at)
            VALUES ($1, $2, 'ADMIN', now(), now())
          `, [userId, workspace.rows[0].id]);
          console.log('✅ Added to workspace with ADMIN role');
        }
      }
      
      await pool.end();
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash('admin123', 10);
    console.log('🔐 Password hashed');

    // Create user
    const userResult = await pool.query(`
      INSERT INTO users (id, name, email, password, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Varun', 'varun@pms.com', $1, now(), now())
      RETURNING id
    `, [passwordHash]);

    const userId = userResult.rows[0].id;
    console.log(`✅ User created with ID: ${userId}`);

    // Get or create workspace
    const workspaceResult = await pool.query(`SELECT id FROM workspaces LIMIT 1`);
    
    let workspaceId;
    if (workspaceResult.rows.length > 0) {
      workspaceId = workspaceResult.rows[0].id;
      console.log(`✅ Using existing workspace: ${workspaceId}`);
    } else {
      const newWorkspace = await pool.query(`
        INSERT INTO workspaces (id, name, user_id, image_url, invite_code, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Default Workspace', $1, null, 'DEFAULT', now(), now())
        RETURNING id
      `, [userId]);
      workspaceId = newWorkspace.rows[0].id;
      console.log(`✅ Workspace created: ${workspaceId}`);
    }

    // Add as ADMIN member
    await pool.query(`
      INSERT INTO members (user_id, workspace_id, role, created_at, updated_at)
      VALUES ($1, $2, 'ADMIN', now(), now())
    `, [userId, workspaceId]);

    console.log('✅ Added to workspace with ADMIN role');
    console.log('\n🎯 Login credentials:');
    console.log('   Email: varun@pms.com');
    console.log('   Password: admin123');
    console.log('   Role: ADMIN\n');

    await pool.end();
  } catch (e) {
    console.error('❌ Error:', e.message);
    await pool.end();
    process.exit(1);
  }
}

addVarunUser();
