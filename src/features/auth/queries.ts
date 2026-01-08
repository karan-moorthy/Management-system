import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AUTH_COOKIE } from "./constants";

/**
 * Get current authenticated user with session validation
 * Returns null if unauthenticated or session expired
 * Automatically cleans up expired sessions
 */
export const getCurrent = async () => {
  try {
    const sessionCookie = (await cookies()).get(AUTH_COOKIE);

    if (!sessionCookie?.value) {
      return null;
    }

    console.log('[getCurrent] Looking for session token:', sessionCookie.value.substring(0, 10) + '...');

    // Get session from PostgreSQL
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionCookie.value))
      .limit(1);

    if (!session) {
      console.warn('[getCurrent] Session not found in database. Token:', sessionCookie.value.substring(0, 10) + '...');
      return null;
    }

    console.log('[getCurrent] Session found, user ID:', session.userId);

    // Check if session is expired
    const now = new Date();
    if (session.expires < now) {
      console.warn('[getCurrent] Session expired at:', session.expires, 'Current time:', now);
      
      // Clean up expired session asynchronously (don't await)
      db.delete(sessions)
        .where(eq(sessions.sessionToken, sessionCookie.value))
        .catch(err => console.error('[getCurrent] Failed to cleanup expired session:', err));
      
      return null;
    }

    // Get user from PostgreSQL
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      console.warn('[getCurrent] User not found for session');
      return null;
    }

    return user;
  } catch (error) {
    // During build, Next.js throws errors for routes using cookies() - this is expected
    if (error instanceof Error && error.message.includes('Dynamic server usage')) {
      // This is a Next.js build-time message, not a runtime error
      // Routes will be dynamically rendered, which is correct for authenticated routes
      return null;
    }
    
    // Log actual runtime errors only
    console.error('[getCurrent] Runtime error:', error);
    return null;
  }
};

export const getCurrentMember = async () => {
  try {
    const user = await getCurrent();
    if (!user) return null;

    // Get member info to check role
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, user.id))
      .limit(1);

    return member || null;
  } catch {
    return null;
  }
};
