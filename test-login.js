import { config } from 'dotenv';
import { db } from './src/db/index';
import { users } from './src/db/schema';
import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';

config({ path: '.env.local' });

async function testLogin() {
  try {
    const testEmail = 'demo@example.com';
    const testPassword = 'password123'; // Try common passwords
    
    console.log('🔍 Testing login for:', testEmail);
    
    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);
    
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ User found:', user.name);
    console.log('📧 Email:', user.email);
    console.log('🔑 Password hash (first 20 chars):', user.password?.substring(0, 20) + '...');
    
    if (!user.password) {
      console.log('❌ User has no password set!');
      process.exit(1);
    }
    
    // Test password
    console.log('\n🧪 Testing password:', testPassword);
    const isValid = await compare(testPassword, user.password);
    
    if (isValid) {
      console.log('✅ Password is correct!');
      console.log('\n✅ Login should work with:');
      console.log('   Email:', testEmail);
      console.log('   Password:', testPassword);
    } else {
      console.log('❌ Password is incorrect');
      console.log('\n⚠️  The user exists but the password doesn\'t match.');
      console.log('   You may need to register a new user or reset the password.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLogin();
