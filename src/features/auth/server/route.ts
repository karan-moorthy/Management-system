import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { deleteCookie, setCookie } from "hono/cookie";
import { compare, hash } from "bcryptjs";
import { randomBytes } from "crypto";

import { loginSchema, registerSchema } from "../schemas";
import { AUTH_COOKIE } from "../constants";
import { sessionMiddleware } from "@/lib/session-middleware";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

const app = new Hono()
  .get("/current", sessionMiddleware, (c) => {
    const user = c.get("user");

    return c.json({ data: user });
  })
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.password) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    // Create session
    const sessionToken = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await db.insert(sessions).values({
      sessionToken,
      userId: user.id,
      expires: expiresAt,
    });

    setCookie(c, AUTH_COOKIE, sessionToken, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30,
    });

    return c.json({ success: true });
  })
  .post("/register", zValidator("json", registerSchema), async (c) => {
    const { name, email, password } = c.req.valid("json");

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return c.json({ error: "Email already in use" }, 400);
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user
    await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
    });

    return c.json({ success: true });
  })
  .post("/logout", sessionMiddleware, async (c) => {
    const user = c.get("user");
    
    // Get session token from cookie
    const sessionToken = c.req.raw.headers.get("cookie")?.split(`${AUTH_COOKIE}=`)[1]?.split(";")[0];

    if (sessionToken) {
      // Delete session from database
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    }

    deleteCookie(c, AUTH_COOKIE);

    return c.json({ success: true });
  });

export default app;
