import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AUTH_COOKIE } from "./constants";

export const getCurrent = async () => {
  try {
    const sessionCookie = (await cookies()).get(AUTH_COOKIE);

    if (!sessionCookie?.value) {
      return null;
    }

    // Get session from PostgreSQL
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionCookie.value))
      .limit(1);

    if (!session || session.expires < new Date()) {
      return null;
    }

    // Get user from PostgreSQL
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    return user || null;
  } catch {
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
