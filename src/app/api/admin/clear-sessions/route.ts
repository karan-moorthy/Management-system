import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

// Admin route to clear all sessions and force re-authentication
export async function POST(request: NextRequest) {
  try {
    console.log('[CLEAR-SESSIONS] Starting session cleanup...');

    // Clear sessions table
    const sessionsResult: any = await db.execute(sql`DELETE FROM sessions`);
    const sessionsRows = Array.isArray(sessionsResult) ? sessionsResult : sessionsResult.rows || [];
    console.log('[CLEAR-SESSIONS] Cleared sessions table');

    // Clear user_sessions table if it exists
    let userSessionsCleared = 0;
    try {
      const userSessionsResult: any = await db.execute(sql`DELETE FROM user_sessions`);
      const userRows = Array.isArray(userSessionsResult) ? userSessionsResult : userSessionsResult.rows || [];
      console.log('[CLEAR-SESSIONS] Cleared user_sessions table');
      userSessionsCleared = 1;
    } catch (err) {
      console.log('[CLEAR-SESSIONS] user_sessions table does not exist (OK)');
    }

    return NextResponse.json({
      success: true,
      message: 'All sessions cleared. Users will need to sign in again.',
      tablesCleared: userSessionsCleared === 1 ? ['sessions', 'user_sessions'] : ['sessions']
    });
  } catch (error) {
    console.error('[CLEAR-SESSIONS] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to clear sessions', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
