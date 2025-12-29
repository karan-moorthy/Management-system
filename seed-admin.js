const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb'
  });

  // Check if admin exists
  const existing = await pool.query(`SELECT id FROM users WHERE email='admin@ggs.com'`);
  
  if (existing.rows.length > 0) {
    console.log('✅ Admin user already exists');
    await pool.end();
    return;
  }

  console.log('👤 Creating admin user...');
  
  // Hash: password123
  const passwordHash = '$2a$10$YFQqK0x8I.lY9xZ3RvK4H.dPX2XJZWz3qF3QqZ5NG7ZYQX9Z5QXQG';
  
  // Insert admin user
  const userResult = await pool.query(`
    INSERT INTO users (id, name, email, password, created_at, updated_at)
    VALUES (gen_random_uuid(), 'Admin', 'admin@ggs.com', $1, now(), now())
    RETURNING id
  `, [passwordHash]);

  const userId = userResult.rows[0].id;
  console.log(`✅ Admin user created with ID: ${userId}`);

  // Create a default workspace
  const workspaceResult = await pool.query(`
    INSERT INTO workspaces (id, name, user_id, image_url, invite_code, created_at, updated_at)
    VALUES (gen_random_uuid(), 'Default Workspace', $1, null, 'DEFAULT', now(), now())
    RETURNING id
  `, [userId]);

  const workspaceId = workspaceResult.rows[0].id;
  console.log(`✅ Workspace created with ID: ${workspaceId}`);

  // Add admin as member
  await pool.query(`
    INSERT INTO members (user_id, workspace_id, role, created_at, updated_at)
    VALUES ($1, $2, 'ADMIN', now(), now())
  `, [userId, workspaceId]);

  console.log('✅ Admin added to workspace');
  console.log('🎯 Login with: admin@ggs.com / password123');

  await pool.end();
}

seedAdmin().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
