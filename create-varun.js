const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function createVarun() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb'
  });

  // Check if varun exists
  const existing = await pool.query(`SELECT id FROM users WHERE email='varun@pms.com'`);
  
  if (existing.rows.length > 0) {
    console.log('✅ Varun already exists');
    await pool.end();
    return;
  }

  console.log('👤 Creating varun@pms.com...');
  
  // Hash password: admin123
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  // Insert varun user
  const userResult = await pool.query(`
    INSERT INTO users (id, name, email, password, created_at, updated_at)
    VALUES (gen_random_uuid(), 'Varun', 'varun@pms.com', $1, now(), now())
    RETURNING id
  `, [passwordHash]);

  const userId = userResult.rows[0].id;
  console.log(`✅ User created with ID: ${userId}`);

  // Get existing workspace or create one
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

  // Add varun as admin member
  await pool.query(`
    INSERT INTO members (user_id, workspace_id, role, created_at, updated_at)
    VALUES ($1, $2, 'ADMIN', now(), now())
  `, [userId, workspaceId]);

  console.log('✅ Varun added to workspace as ADMIN');
  console.log('🎯 Login with: varun@pms.com / admin123');

  await pool.end();
}

createVarun().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
