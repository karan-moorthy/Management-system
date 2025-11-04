import { config } from 'dotenv';
import { db } from './index';
import { sql } from 'drizzle-orm';

config({ path: '.env.local' });

async function checkConnection() {
  try {
    console.log('🔍 Checking PostgreSQL connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
    
    // Test basic connection
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    console.log('✅ Database connection successful!');
    console.log('Current time from DB:', result);
    
    // Check if tables exist
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('\n📊 Tables in database:');
    if (tables.length === 0) {
      console.log('⚠️  No tables found. You need to run migrations.');
      console.log('Run: npm run db:push');
    } else {
      tables.forEach((table: any) => {
        console.log(`  - ${table.table_name}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

checkConnection();
