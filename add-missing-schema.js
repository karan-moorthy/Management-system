const { Pool } = require('pg');

async function addMissingSchema() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:admin@localhost:5432/pmsdb'
  });

  console.log('🔧 Adding missing columns and tables...\n');

  try {
    // Add project_id to members table
    console.log('📌 Adding project_id to members...');
    await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS project_id uuid`);
    console.log('✅ project_id column added\n');

    // Create notifications table
    console.log('📌 Creating notifications table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        task_id uuid,
        type text NOT NULL,
        title text NOT NULL,
        message text,
        action_by uuid,
        action_by_name text,
        is_read boolean DEFAULT false,
        read_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ notifications table created\n');

    // Create activity_logs table
    console.log('📌 Creating activity_logs table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        action_type text NOT NULL,
        entity_type text NOT NULL,
        entity_id uuid,
        user_id uuid NOT NULL,
        user_name text NOT NULL,
        workspace_id uuid,
        project_id uuid,
        task_id uuid,
        changes jsonb,
        summary text,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ activity_logs table created\n');

    // Create other potentially missing tables
    console.log('📌 Creating other missing tables...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS weekly_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        week_start date NOT NULL,
        week_end date NOT NULL,
        is_draft boolean DEFAULT true,
        submitted_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bug_tracker (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        description text,
        severity text,
        status text DEFAULT 'OPEN',
        workspace_id uuid NOT NULL,
        project_id uuid,
        reported_by uuid NOT NULL,
        assigned_to uuid,
        output_file text,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_fields (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL,
        project_id uuid,
        field_name text NOT NULL,
        field_type text NOT NULL,
        field_options jsonb,
        is_required boolean DEFAULT false,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS board_columns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id uuid NOT NULL,
        name text NOT NULL,
        "order" integer NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS client_invitations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL,
        workspace_id uuid NOT NULL,
        project_id uuid,
        invited_by uuid NOT NULL,
        status text DEFAULT 'PENDING',
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `);

    console.log('✅ All missing tables created\n');

    // Verify
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
      ORDER BY table_name
    `);
    
    console.log(`📋 Total tables: ${tables.rows.length}`);
    tables.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));

    await pool.end();
    console.log('\n✅ Database schema complete!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    await pool.end();
    process.exit(1);
  }
}

addMissingSchema();
