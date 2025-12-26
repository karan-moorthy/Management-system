import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { deleteCookie, setCookie } from "hono/cookie";
import { compare, hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";

import { loginSchema, registerSchema } from "../schemas";
import { AUTH_COOKIE } from "../constants";
import { sessionMiddleware } from "@/lib/session-middleware";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

const updateProfileSchema = z.object({
  native: z.string().optional(),
  mobileNo: z.string().optional(),
  experience: z.number().optional(),
  skills: z.array(z.string()).optional(),
  image: z.string().optional(), // Base64 encoded image or image URL
});

const app = new Hono()
  .get("/health", async (c) => {
    try {
      // Test database connection
      const result = await db.select().from(users).limit(1);
      return c.json({ 
        status: "ok", 
        database: "connected",
        users_count: result.length > 0 ? "has data" : "empty",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Health check error:', error);
      return c.json({ 
        status: "error",
        database: "disconnected",
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 500);
    }
  })
  .get("/current", sessionMiddleware, (c) => {
    const user = c.get("user");

    return c.json({ data: user });
  })
  .post("/login", zValidator("json", loginSchema), async (c) => {
    try {
      const { email, password } = c.req.valid("json");

      console.log('[LOGIN] Attempting login for:', email);

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      console.log('[LOGIN] User found:', user ? 'yes' : 'no');

      if (!user || !user.password) {
        console.log('[LOGIN] User not found or no password');
        return c.json({ error: "Invalid email or password" }, 401);
      }

      // Verify password
      console.log('[LOGIN] Comparing password...');
      const isPasswordValid = await compare(password, user.password);
      console.log('[LOGIN] Password valid:', isPasswordValid);

      if (!isPasswordValid) {
        return c.json({ error: "Invalid email or password" }, 401);
      }

      // Create session
      console.log('[LOGIN] Creating session...');
      const sessionToken = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      await db.insert(sessions).values({
        sessionToken,
        userId: user.id,
        expires: expiresAt,
      });

      console.log('[LOGIN] Session created successfully');

      const isProd = process.env.NODE_ENV === 'production';
      setCookie(c, AUTH_COOKIE, sessionToken, {
        path: "/",
        httpOnly: true,
        secure: isProd, // Only secure in production
        sameSite: isProd ? "strict" : "lax", // Lax for localhost
        maxAge: 60 * 60 * 24 * 30,
      });

      return c.json({ success: true });
    } catch (error) {
      console.error('[LOGIN ERROR]', error);
      return c.json({ 
        error: "An error occurred during login. Please try again.",
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'production' ? undefined : error instanceof Error ? error.stack : undefined
      }, 500);
    }
  })

      const isProd = process.env.NODE_ENV === 'production';
      setCookie(c, AUTH_COOKIE, sessionToken, {
        path: "/",
        httpOnly: true,
        secure: isProd, // Only secure in production
        sameSite: isProd ? "strict" : "lax", // Lax for localhost
        maxAge: 60 * 60 * 24 * 30,
      });

      return c.json({ success: true });
    } catch (error) {
      console.error('Login error:', error);
      return c.json({ 
        error: "An error occurred during login. Please try again.",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
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
  })
  .patch("/profile", sessionMiddleware, zValidator("json", updateProfileSchema), async (c) => {
    const user = c.get("user");
    const updates = c.req.valid("json");

    // Update user profile
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return c.json({ data: updatedUser });
  });

export default app;
