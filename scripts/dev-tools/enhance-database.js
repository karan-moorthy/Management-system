const postgres = require('postgres');
require('dotenv/config');

const sql = postgres({
  host: 'localhost',
  port: 5432,
  database: 'pmsdb',
  username: 'postgres',
  password: 'admin'
});

async function enhanceDatabase() {
  try {
    console.log('🚀 Enhancing database structure for advanced operations...');

    // 1. Add new columns to existing users table
    console.log('\n📝 Enhancing users table...');
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS department TEXT,
      ADD COLUMN IF NOT EXISTS phone_number TEXT,
      ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP
    `;

    // 2. Add new columns to existing workspaces table
    console.log('📝 Enhancing workspaces table...');
    await sql`
      ALTER TABLE workspaces 
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
    `;

    // 3. Add new columns to existing projects table
    console.log('📝 Enhancing projects table...');
    await sql`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM',
      ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2),
      ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'
    `;

    // 4. Add new columns to existing tasks table
    console.log('📝 Enhancing tasks table...');
    await sql`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'TASK',
      ADD COLUMN IF NOT EXISTS epic_id UUID,
      ADD COLUMN IF NOT EXISTS reporter_id UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS remaining_hours INTEGER,
      ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS completed_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0
    `;

    // 5. Create Epics table
    console.log('📝 Creating epics table...');
    await sql`
      CREATE TABLE IF NOT EXISTS epics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#3B82F6',
        icon TEXT,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        owner_id UUID NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        priority TEXT DEFAULT 'MEDIUM',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        estimated_hours INTEGER,
        actual_hours INTEGER DEFAULT 0,
        progress INTEGER DEFAULT 0,
        position INTEGER NOT NULL DEFAULT 1000,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // 6. Create Task Dependencies table
    console.log('📝 Creating task_dependencies table...');
    await sql`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'FINISH_TO_START',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(task_id, depends_on_task_id)
      )
    `;

    // 7. Create Task Comments table
    console.log('📝 Creating task_comments table...');
    await sql`
      CREATE TABLE IF NOT EXISTS task_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'COMMENT',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // 8. Create Time Logs table
    console.log('📝 Creating time_logs table...');
    await sql`
      CREATE TABLE IF NOT EXISTS time_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description TEXT,
        hours_spent DECIMAL(8,2) NOT NULL,
        log_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // 9. Create Board Views table
    console.log('📝 Creating board_views table...');
    await sql`
      CREATE TABLE IF NOT EXISTS board_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        creator_id UUID NOT NULL REFERENCES users(id),
        view_type TEXT NOT NULL DEFAULT 'KANBAN',
        filters JSONB DEFAULT '{}',
        columns JSONB DEFAULT '[]',
        is_default BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // 10. Create Dashboards table
    console.log('📝 Creating dashboards table...');
    await sql`
      CREATE TABLE IF NOT EXISTS dashboards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        creator_id UUID NOT NULL REFERENCES users(id),
        layout JSONB NOT NULL,
        widgets JSONB NOT NULL,
        is_default BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // 11. Create Notifications table
    console.log('📝 Creating notifications table...');
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        entity_type TEXT,
        entity_id UUID,
        is_read BOOLEAN DEFAULT false,
        action_url TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    // 12. Create indexes for better performance
    console.log('📝 Creating performance indexes...');
    
    // Epic indexes
    await sql`CREATE INDEX IF NOT EXISTS epics_project_idx ON epics(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS epics_workspace_idx ON epics(workspace_id)`;
    await sql`CREATE INDEX IF NOT EXISTS epics_status_idx ON epics(status)`;
    await sql`CREATE INDEX IF NOT EXISTS epics_position_idx ON epics(position)`;

    // Task dependency indexes
    await sql`CREATE INDEX IF NOT EXISTS task_dependencies_task_idx ON task_dependencies(task_id)`;
    await sql`CREATE INDEX IF NOT EXISTS task_dependencies_depends_on_idx ON task_dependencies(depends_on_task_id)`;

    // Time logs indexes
    await sql`CREATE INDEX IF NOT EXISTS time_logs_task_idx ON time_logs(task_id)`;
    await sql`CREATE INDEX IF NOT EXISTS time_logs_user_idx ON time_logs(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS time_logs_log_date_idx ON time_logs(log_date)`;

    // Comments indexes
    await sql`CREATE INDEX IF NOT EXISTS task_comments_task_idx ON task_comments(task_id)`;
    await sql`CREATE INDEX IF NOT EXISTS task_comments_author_idx ON task_comments(author_id)`;

    // Board views indexes
    await sql`CREATE INDEX IF NOT EXISTS board_views_project_idx ON board_views(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS board_views_workspace_idx ON board_views(workspace_id)`;

    // Dashboard indexes
    await sql`CREATE INDEX IF NOT EXISTS dashboards_workspace_idx ON dashboards(workspace_id)`;
    await sql`CREATE INDEX IF NOT EXISTS dashboards_creator_idx ON dashboards(creator_id)`;

    // Notification indexes
    await sql`CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read)`;
    await sql`CREATE INDEX IF NOT EXISTS notifications_type_idx ON notifications(type)`;

    // Enhanced task indexes
    await sql`CREATE INDEX IF NOT EXISTS tasks_epic_idx ON tasks(epic_id)`;
    await sql`CREATE INDEX IF NOT EXISTS tasks_reporter_idx ON tasks(reporter_id)`;
    await sql`CREATE INDEX IF NOT EXISTS tasks_type_idx ON tasks(type)`;
    await sql`CREATE INDEX IF NOT EXISTS tasks_start_date_idx ON tasks(start_date)`;

    // 13. Add foreign key constraint for epic_id in tasks
    await sql`
      ALTER TABLE tasks 
      ADD CONSTRAINT IF NOT EXISTS tasks_epic_id_fkey 
      FOREIGN KEY (epic_id) REFERENCES epics(id) ON DELETE SET NULL
    `;

    console.log('\n✅ Database enhancement completed successfully!');
    console.log('\n📊 New capabilities added:');
    console.log('  • Epic-based organization (Parts, Service, Diagnostics, Training)');
    console.log('  • Task dependencies and relationships');
    console.log('  • Time tracking and logging');
    console.log('  • Advanced board views (Kanban, Calendar, Gantt)');
    console.log('  • Custom dashboards and analytics');
    console.log('  • Real-time notifications');
    console.log('  • Enhanced project management features');
    console.log('  • Better user and workspace management');
    
  } catch (error) {
    console.error('❌ Error enhancing database:', error.message);
  } finally {
    await sql.end();
  }
}

enhanceDatabase();