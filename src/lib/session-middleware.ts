import "server-only";

import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";

import { AUTH_COOKIE } from "@/features/auth/constants";

export type User = typeof users.$inferSelect;

type AdditionalContext = {
  Variables: {
    user: User;
    userId: string;
  };
};

export const sessionMiddleware = createMiddleware<AdditionalContext>(
  async (c, next) => {
    const sessionToken = getCookie(c, AUTH_COOKIE);

    if (!sessionToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get session from PostgreSQL
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken))
      .limit(1);

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if session is expired
    if (session.expires < new Date()) {
      // Delete expired session
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
      return c.json({ error: "Session expired" }, 401);
    }

    // Get user from PostgreSQL
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    c.set("user", user);
    c.set("userId", user.id);

    await next();
  }
);
