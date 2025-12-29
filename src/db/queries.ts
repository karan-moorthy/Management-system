import { db } from '@/db';
import { users, workspaces, members, projects, tasks, invitations, sessions } from '@/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { AUTH_COOKIE } from '@/features/auth/constants';

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  const sessionCookie = (await cookies()).get(AUTH_COOKIE);
  
  if (!sessionCookie?.value) {
    return null;
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, sessionCookie.value))
    .limit(1);

  if (!session || session.expires < new Date()) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user || null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user || null;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user || null;
}

/**
 * Create a new user
 */
export async function createUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  const [user] = await db
    .insert(users)
    .values(data)
    .returning();

  return user;
}

/**
 * Get member by workspace and user
 */
export async function getMember({
  workspaceId,
  userId,
}: {
  workspaceId: string;
  userId: string;
}) {
  const [member] = await db
    .select()
    .from(members)
    .where(
      and(
        eq(members.workspaceId, workspaceId),
        eq(members.userId, userId)
      )
    )
    .limit(1);

  return member || null;
}

/**
 * Get all workspaces for a user
 */
export async function getUserWorkspaces(userId: string) {
  const userMembers = await db
    .select()
    .from(members)
    .where(eq(members.userId, userId));

  if (userMembers.length === 0) {
    return [];
  }

  const workspaceIds = userMembers.map(m => m.workspaceId);
  
  const userWorkspaces = await db
    .select()
    .from(workspaces)
    .where(
      eq(workspaces.id, workspaceIds[0])
    )
    .orderBy(desc(workspaces.createdAt));

  return userWorkspaces;
}

/**
 * Create session for user
 */
export async function createSession(userId: string, sessionToken: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      sessionToken,
      expires: expiresAt,
    })
    .returning();

  return session;
}

/**
 * Delete session
 */
export async function deleteSession(sessionToken: string) {
  await db
    .delete(sessions)
    .where(eq(sessions.sessionToken, sessionToken));
}
