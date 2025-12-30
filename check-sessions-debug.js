/**
 * Session Debug Script
 * Run this to check for session issues after login/logout
 * 
 * Usage: node check-sessions-debug.js
 */

import 'dotenv/config';
import { db } from './src/db/index.js';
import { sessions, users } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function checkSessions() {
  console.log('🔍 Checking session status...\n');

  try {
    // Get all sessions
    const allSessions = await db.select().from(sessions);
    
    console.log(`📊 Total sessions in database: ${allSessions.length}\n`);

    if (allSessions.length === 0) {
      console.log('✅ No active sessions (all users logged out)\n');
      return;
    }

    // Check for expired sessions
    const now = new Date();
    const expiredSessions = allSessions.filter(s => s.expires < now);
    const activeSessions = allSessions.filter(s => s.expires >= now);

    console.log(`⏰ Expired sessions: ${expiredSessions.length}`);
    console.log(`✅ Active sessions: ${activeSessions.length}\n`);

    // Group sessions by user
    const sessionsByUser = {};
    for (const session of allSessions) {
      if (!sessionsByUser[session.userId]) {
        sessionsByUser[session.userId] = [];
      }
      sessionsByUser[session.userId].push(session);
    }

    // Check for users with multiple sessions
    console.log('👥 Sessions per user:\n');
    
    for (const [userId, userSessions] of Object.entries(sessionsByUser)) {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const userName = user?.name || user?.email || 'Unknown';
      
      const activeCount = userSessions.filter(s => s.expires >= now).length;
      const expiredCount = userSessions.filter(s => s.expires < now).length;
      
      const status = userSessions.length > 1 ? '⚠️  MULTIPLE' : '✅';
      
      console.log(`${status} ${userName}:`);
      console.log(`   - Active: ${activeCount}`);
      console.log(`   - Expired: ${expiredCount}`);
      console.log(`   - Total: ${userSessions.length}`);
      
      if (userSessions.length > 1) {
        console.log('   ⚠️  WARNING: Multiple sessions detected! This should not happen.');
        userSessions.forEach((s, i) => {
          const isExpired = s.expires < now;
          console.log(`      ${i + 1}. Token: ${s.sessionToken.substring(0, 8)}... | Expires: ${s.expires.toISOString()} ${isExpired ? '(EXPIRED)' : ''}`);
        });
      }
      
      console.log('');
    }

    // Recommendations
    console.log('\n📋 Recommendations:\n');
    
    if (expiredSessions.length > 0) {
      console.log(`⚠️  Found ${expiredSessions.length} expired session(s). Run cleanup:`);
      console.log('   await cleanupExpiredSessions(); // From session-cleanup.ts');
      console.log('');
    }

    const multipleSessionUsers = Object.values(sessionsByUser).filter(s => s.length > 1).length;
    if (multipleSessionUsers > 0) {
      console.log(`❌ Found ${multipleSessionUsers} user(s) with multiple sessions!`);
      console.log('   This indicates the login cleanup is not working.');
      console.log('   Check that deleteUserSessions() is being called on login.');
      console.log('');
    }

    if (expiredSessions.length === 0 && multipleSessionUsers === 0) {
      console.log('✅ All sessions look healthy!');
      console.log('   - No expired sessions');
      console.log('   - One session per user');
      console.log('   - Logout cleanup working correctly');
    }

  } catch (error) {
    console.error('❌ Error checking sessions:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

checkSessions();
