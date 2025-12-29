const postgres = require('postgres');
const bcrypt = require('bcryptjs');

async function main() {
  const sql = postgres('postgresql://postgres:admin@localhost:5432/pmsdb', { max: 1 });

  try {
    console.log('🔄 Resetting local database...');

    // Drop all tables (cascading)
    await sql`DROP SCHEMA public CASCADE`;
    await sql`CREATE SCHEMA public`;
    
    console.log('✅ Schema reset complete');
    
    // Now run migrations
    await sql.end();
    
    // Reopen connection and run migrations
    const { drizzle } = require('drizzle-orm/postgres-js');
    const { migrate } = require('drizzle-orm/postgres-js/migrator');
    
    const migrationSql = postgres('postgresql://postgres:admin@localhost:5432/pmsdb', { max: 1 });
    const db = drizzle(migrationSql);
    
    console.log('📦 Running migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('✅ Migrations complete!');
    console.log('👤 Creating test user...');
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const userId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    
    await migrationSql`
      INSERT INTO users (id, name, email, password, created_at, updated_at)
      VALUES (${userId}, 'Admin User', 'admin@ggs.com', ${hashedPassword}, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `;
    
    await migrationSql`
      INSERT INTO workspaces (id, name, user_id, created_at, updated_at)
      VALUES (${workspaceId}, 'My Workspace', ${userId}, NOW(), NOW())
      ON CONFLICT DO NOTHING
    `;
    
    console.log('✅ Test user created!');
    console.log('📧 Email: admin@ggs.com');
    console.log('🔑 Password: password123');
    
    await migrationSql.end();
    
  } catch (err) {
    console.error('❌ Error:', err);
    await sql.end();
    process.exit(1);
  }
}

main();
