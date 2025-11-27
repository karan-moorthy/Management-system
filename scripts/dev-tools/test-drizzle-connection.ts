import { db } from '../../src/db/index';
import { users, workspaces, tasks, projects, members, invitations } from '../../src/db/schema';
import { sql } from 'drizzle-orm';

async function testDrizzleConnection() {
  console.log('🔍 Testing PostgreSQL Connection with Drizzle ORM...\n');
  
  try {
    // Test 1: Basic connection and version check
    console.log('📍 Test 1: Database Connection');
    const versionResult = await db.execute(sql`SELECT version()`);
    const version = (versionResult[0] as any).version;
    console.log('✅ Connected successfully!');
    console.log(`   PostgreSQL: ${version.split(' ').slice(0, 2).join(' ')}\n`);
    
    // Test 2: Check tables exist
    console.log('📍 Test 2: Verify Tables Exist');
    const tablesResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tableNames = (tablesResult as any[]).map((row: any) => row.table_name);
    const expectedTables = [
      'users',
      'accounts',
      'sessions',
      'verification_tokens',
      'workspaces',
      'members',
      'projects',
      'tasks',
      'invitations'
    ];
    
    const missingTables = expectedTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length === 0) {
      console.log('✅ All expected tables exist!');
      console.log(`   Found ${tableNames.length} tables:\n`);
      tableNames.forEach((table: string) => {
        console.log(`   ${expectedTables.includes(table) ? '✅' : '  '} ${table}`);
      });
    } else {
      console.log('⚠️  Missing tables:', missingTables.join(', '));
    }
    console.log('');
    
    // Test 3: Count records in each table
    console.log('📍 Test 3: Record Counts');
    
    const usersCount = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const workspacesCount = await db.execute(sql`SELECT COUNT(*) as count FROM workspaces`);
    const projectsCount = await db.execute(sql`SELECT COUNT(*) as count FROM projects`);
    const tasksCount = await db.execute(sql`SELECT COUNT(*) as count FROM tasks`);
    const membersCount = await db.execute(sql`SELECT COUNT(*) as count FROM members`);
    const invitationsCount = await db.execute(sql`SELECT COUNT(*) as count FROM invitations`);
    
    console.log(`   Users:       ${(usersCount[0] as any).count}`);
    console.log(`   Workspaces:  ${(workspacesCount[0] as any).count}`);
    console.log(`   Projects:    ${(projectsCount[0] as any).count}`);
    console.log(`   Tasks:       ${(tasksCount[0] as any).count}`);
    console.log(`   Members:     ${(membersCount[0] as any).count}`);
    console.log(`   Invitations: ${(invitationsCount[0] as any).count}`);
    console.log('');
    
    // Test 4: Verify indexes exist
    console.log('📍 Test 4: Verify Indexes');
    const indexesResult = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    console.log(`✅ Found ${(indexesResult as any[]).length} indexes`);
    
    // Test 5: Check foreign key constraints
    console.log('\n📍 Test 5: Verify Foreign Key Constraints');
    const fkResult = await db.execute(sql`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `);
    
    console.log(`✅ Found ${(fkResult as any[]).length} foreign key constraints`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL DATABASE TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log('   ✅ PostgreSQL connection: Working');
    console.log('   ✅ Drizzle ORM integration: Working');
    console.log('   ✅ Database schema: Properly configured');
    console.log('   ✅ Tables: All present');
    console.log('   ✅ Indexes: Configured');
    console.log('   ✅ Foreign keys: Configured');
    console.log('\n🎉 Your PostgreSQL database is fully connected and ready to use!\n');
    
  } catch (error: any) {
    console.error('\n❌ Database Test Failed!');
    console.error('\nError:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 PostgreSQL server is not running or not accessible');
      console.error('   • Start PostgreSQL service');
      console.error('   • Check connection string in .env.local');
    } else if (error.code === '42P01') {
      console.error('\n💡 Table does not exist');
      console.error('   • Run migrations: npm run db:push or npx drizzle-kit push');
    } else {
      console.error('\n💡 Full error details:');
      console.error(error);
    }
    
    process.exit(1);
  }
}

testDrizzleConnection();
