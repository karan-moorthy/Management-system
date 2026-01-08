import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { deleteCookie, setCookie, getCookie } from "hono/cookie";
import { compare, hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";

import { loginSchema, registerSchema } from "../schemas";
import { AUTH_COOKIE } from "../constants";
import { sessionMiddleware } from "@/lib/session-middleware";
import { getAuthCookieConfig, logCookieConfig } from "@/lib/cookie-config";
import { deleteUserSessions, deleteSession } from "@/lib/session-cleanup";
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
    
    // Add session validity indicator
    return c.json({ 
      data: user,
      sessionValid: true,
      timestamp: new Date().toISOString()
    });
  })
  .post("/login", zValidator("json", loginSchema), async (c) => {
    console.log('[Sign-in] Login attempt started');
    
    try {
      const { email, password } = c.req.valid("json");
      console.log('[Sign-in] Credentials validated for email:', email);

      // Find user by email
      console.log('[Sign-in] Querying database for user...');
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user || !user.password) {
        console.log('[Sign-in] User not found or no password');
        return c.json({ error: "Invalid email or password" }, 401);
      }

      console.log('[Sign-in] User found:', user.id);

      // Verify password
      const isPasswordValid = await compare(password, user.password);

      if (!isPasswordValid) {
        console.log('[Sign-in] Password invalid');
        return c.json({ error: "Invalid email or password" }, 401);
      }

      console.log('[Sign-in] Password verified successfully');

      // CRITICAL: Delete all existing sessions for this user before creating new one
      // This prevents stale sessions from interfering with subsequent logouts
      try {
        const result = await db
          .delete(sessions)
          .where(eq(sessions.userId, user.id));
        console.log('[Login] Cleaned up existing sessions for user:', user.id);
      } catch (cleanupError) {
        console.error('[Login] Session cleanup failed:', cleanupError);
        // Critical: If we can't cleanup sessions, login shouldn't proceed
        // This prevents session leak issues
        return c.json({ 
          error: "Session cleanup failed. Please try again.",
          details: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
        }, 500);
      }

      // Create session
      const sessionToken = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      console.log('[Sign-in] Creating session for user:', user.id, 'Token:', sessionToken.substring(0, 10) + '...');

      try {
        const insertResult = await db.insert(sessions).values({
          sessionToken,
          userId: user.id,
          expires: expiresAt,
        }).returning();

        console.log('[Sign-in] Session inserted successfully:', insertResult[0]?.sessionToken?.substring(0, 10) + '...');
      } catch (sessionError) {
        console.error('[Sign-in] Failed to insert session:', sessionError);
        throw new Error('Failed to create session in database');
      }

      // Use standardized cookie configuration
      const cookieOptions = getAuthCookieConfig({ includeMaxAge: true });
      logCookieConfig('set', cookieOptions);

      setCookie(c, AUTH_COOKIE, sessionToken, cookieOptions);
      console.log('[Sign-in] Cookie set successfully');

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
      console.log('[Logout] Session token (first 8 chars):', sessionToken ? sessionToken.substring(0, 8) : 'none');

      // Track success for both DB and cookie operations
      let sessionDeleted = false;
      let cookieDeleted = false;

      if (sessionToken) {
        // Delete session from database using helper
        try {
          await deleteSession(sessionToken);
          sessionDeleted = true;
          console.log('[Logout] Session deleted from database');
        } catch (dbError) {
          console.error('[Logout] Database deletion error:', dbError);
          // Continue - cookie deletion is critical
        }
      } else {
        console.warn('[Logout] No session token found in cookie');
        sessionDeleted = true; // No session to delete = success
      }

      // Always delete the cookie using standardized configuration
      // Triple-layer deletion to ensure removal across all scenarios
      try {
        const cookieOptions = getAuthCookieConfig({ forDeletion: true });
        logCookieConfig('delete', cookieOptions);

        // Layer 1: Primary deletion with full options
        deleteCookie(c, AUTH_COOKIE, cookieOptions);
        
        // Layer 2: Delete without domain to catch browser-set cookies
        const optionsNoDomain = { ...cookieOptions };
        delete optionsNoDomain.domain;
        deleteCookie(c, AUTH_COOKIE, optionsNoDomain);
        
        // Layer 3: Force set expired cookie as absolute backup
        setCookie(c, AUTH_COOKIE, '', {
          ...cookieOptions,
          maxAge: 0,
          expires: new Date(0),
        });
        
        cookieDeleted = true;
        console.log('[Logout] Cookie deletion completed successfully');
      } catch (cookieError) {
        console.error('[Logout] Cookie deletion error:', cookieError);
        // Even if cookie deletion has an error, we'll report success
        // since the session is gone from DB
        cookieDeleted = false;
      }

      const message = sessionDeleted && cookieDeleted 
        ? "Logged out successfully"
        : sessionDeleted 
          ? "Logged out (cookie cleanup may be incomplete)"
          : "Logged out (session cleanup incomplete)";
          
      console.log('[Logout] Logout process completed:', { sessionDeleted, cookieDeleted });
      return c.json({ 
        success: true, 
        message,
        details: { sessionDeleted, cookieDeleted }
      });
    } catch (error) {
      console.error('[Logout] Unexpected error:', error);
      // Even if something fails, try to delete the cookie and return success
      // This ensures logout always works from the user's perspective
      try {
        const isProd = process.env.NODE_ENV === 'production';
        const cookieOptions: any = {
          path: "/",
          httpOnly: true,
          secure: isProd,
          sameSite: "lax",
        };

        if (isProd && process.env.NEXT_PUBLIC_APP_URL) {
          try {
            const url = new URL(process.env.NEXT_PUBLIC_APP_URL);
            if (!url.hostname.match(/^(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)$/)) {
              cookieOptions.domain = url.hostname;
            }
          } catch {}
        }

        deleteCookie(c, AUTH_COOKIE, cookieOptions);
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
