import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL!);

async function check() {
  try {
    const result = await sql`SELECT * FROM custom_departments`;
    console.log('✅ custom_departments table exists!');
    console.log(`📊 Current departments count: ${result.length}`);
    if (result.length > 0) {
      console.log('Departments:', result);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

check();
