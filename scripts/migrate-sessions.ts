import { db } from '@/db';
import { sql } from 'drizzle-orm';

async function migrateSessions() {
  console.log('🔄 Starting session migration...');
  
  try {
    // Check if user_sessions table exists
    const tableCheck: any = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_sessions'
      ) as exists
    `);
    
    const tableRows = Array.isArray(tableCheck) ? tableCheck : tableCheck.rows || [];
    const userSessionsExists = tableRows[0]?.exists;

    if (!userSessionsExists) {
      console.log('✅ No user_sessions table found - migration not needed');
      return;
    }

    console.log('📋 Found user_sessions table, checking for sessions to migrate...');

    // Count sessions in old table
    const countResult: any = await db.execute(sql`
      SELECT COUNT(*) as count FROM user_sessions WHERE expires > NOW()
    `);
    const countRows = Array.isArray(countResult) ? countResult : countResult.rows || [];
    const validSessionsCount = parseInt(countRows[0]?.count as string || '0');

    console.log(`📊 Found ${validSessionsCount} valid (non-expired) sessions in user_sessions table`);

    if (validSessionsCount === 0) {
      console.log('✅ No valid sessions to migrate');
      return;
    }

    // Migrate valid sessions from user_sessions to sessions
    console.log('🔄 Migrating sessions...');
    
    const migrateResult: any = await db.execute(sql`
      INSERT INTO sessions (session_token, user_id, expires)
      SELECT session_token, user_id, expires 
      FROM user_sessions 
      WHERE expires > NOW()
      ON CONFLICT (session_token) DO NOTHING
    `);

    console.log('✅ Migration completed successfully!');
    console.log(`   Migrated ${validSessionsCount} sessions from user_sessions → sessions`);

    // Optional: Drop the old table (commented out for safety)
    // console.log('🗑️  Dropping old user_sessions table...');
    // await db.execute(sql`DROP TABLE user_sessions`);
    // console.log('✅ Old table dropped');

    console.log('\n⚠️  Note: user_sessions table still exists (not dropped)');
    console.log('   If you want to remove it, run: DROP TABLE user_sessions;');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

migrateSessions()
  .then(() => {
    console.log('\n✅ Session migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
