import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { deleteCookie, setCookie, getCookie } from "hono/cookie";
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
  .post("/logout", async (c) => {
    try {
      console.log('[Logout] Starting logout process');
      
      // Validate request method
      if (c.req.method !== 'POST') {
        return c.json({ error: "Method not allowed" }, 405);
      }
      
      // Get session token from cookie - don't use sessionMiddleware as it may fail
      const sessionToken = getCookie(c, AUTH_COOKIE);
      console.log('[Logout] Session token present:', !!sessionToken);

      if (sessionToken) {
        // Delete session from database
        try {
          await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
          console.log('[Logout] Session deleted successfully');
        } catch (dbError) {
          console.error('[Logout] Database deletion error:', dbError);
          // Continue even if session deletion fails - cookie deletion is more important
        }
      }

      // Always delete the cookie, even if session deletion failed
      // This is critical for production HTTPS environments
      deleteCookie(c, AUTH_COOKIE, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? "strict" : "lax",
      });

      console.log('[Logout] Logout successful');
      return c.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      console.error('[Logout] Unexpected error:', error);
      // Even if something fails, try to delete the cookie and return success
      // This ensures logout always works from the user's perspective
      try {
        deleteCookie(c, AUTH_COOKIE, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? "strict" : "lax",
        });
      } catch (cookieError) {
        console.error('[Logout] Cookie deletion error:', cookieError);
      }
      return c.json({ 
        success: true, 
        message: "Logged out (with errors)",
        warning: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  })
  .patch("/profile", sessionMiddleware, zValidator("json", updateProfileSchema), async (c) => {
    try {
      const user = c.get("user");
      const updates = c.req.valid("json");

      console.log('[Profile Update] Updating profile for user:', user.id);

      // Update user profile - execute without .returning() to avoid #state error
      await db
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Fetch the updated user separately to avoid #state serialization issue
      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (!updatedUser) {
        console.error('[Profile Update] User not found:', user.id);
        return c.json({ error: "User not found" }, 404);
      }

      console.log('[Profile Update] Profile updated successfully');
      return c.json({ success: true, data: updatedUser });
    } catch (error) {
      console.error('[Profile Update] Error:', error);
      return c.json({ 
        error: "Failed to update profile",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 500);
    }
  });

export default app;
