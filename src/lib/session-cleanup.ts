/**
 * Session Cleanup Utilities
 * Provides functions to clean up stale and expired sessions
 */

import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq, lt, and } from 'drizzle-orm';

/**
 * Delete all sessions for a specific user
 * Used during login to prevent stale session interference
 */
export async function deleteUserSessions(userId: string): Promise<void> {
  try {
    await db
      .delete(sessions)
      .where(eq(sessions.userId, userId));
    
    console.log(`[Session Cleanup] Deleted all sessions for user: ${userId}`);
  } catch (error) {
    console.error('[Session Cleanup] Error deleting user sessions:', error);
    throw error;
  }
}

/**
 * Delete a specific session by token
 * Used during logout
 */
export async function deleteSession(sessionToken: string): Promise<void> {
  try {
    await db
      .delete(sessions)
      .where(eq(sessions.sessionToken, sessionToken));
    
    console.log(`[Session Cleanup] Deleted session ${sessionToken.substring(0, 8)}...`);
  } catch (error) {
    console.error('[Session Cleanup] Error deleting session:', error);
    throw error;
  }
}

/**
 * Delete all expired sessions from database
 * Should be run periodically (e.g., via cron)
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await db
      .delete(sessions)
      .where(lt(sessions.expires, new Date()));
    
    console.log('[Session Cleanup] Cleaned up expired sessions');
  } catch (error) {
    console.error('[Session Cleanup] Error cleaning expired sessions:', error);
    throw error;
  }
}

/**
 * Get session count for a user (for debugging)
 */
export async function getUserSessionCount(userId: string): Promise<number> {
  try {
    const userSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId));
    
    return userSessions.length;
  } catch (error) {
    console.error('[Session Cleanup] Error counting user sessions:', error);
    return 0;
  }
}

/**
 * Get total active session count (for monitoring)
 */
export async function getTotalSessionCount(): Promise<{
  total: number;
  expired: number;
  active: number;
}> {
  try {
    const allSessions = await db.select().from(sessions);
    const now = new Date();
    
    const expired = allSessions.filter(s => s.expires < now).length;
    const total = allSessions.length;
    const active = total - expired;
    
    return { total, expired, active };
  } catch (error) {
    console.error('[Session Cleanup] Error getting session counts:', error);
    return { total: 0, expired: 0, active: 0 };
  }
}
