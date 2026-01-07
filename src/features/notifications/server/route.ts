import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";

import { db, sql_client } from "@/db";
import { notifications } from "@/db/schema";
import { sessionMiddleware } from "@/lib/session-middleware";

const app = new Hono()
  // Get user's notifications
  .get("/", sessionMiddleware, async (c) => {
    try {
      const user = c.get("user");
      console.log('[Get Notifications] Fetching for user:', user.id);

      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(50);

      console.log('[Get Notifications] Found', userNotifications.length, 'notifications');
      return c.json({ success: true, data: userNotifications });
    } catch (error) {
      console.error("[Get Notifications] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return c.json(
        { success: false, error: "Failed to fetch notifications", details: errorMessage },
        500
      );
    }
  })

  // Mark notification as read
  .patch("/:notificationId/read", sessionMiddleware, async (c) => {
    try {
      const user = c.get("user");
      const { notificationId } = c.req.param();
      console.log('[Mark Read] User:', user.id, 'Notification:', notificationId);

      await db
        .update(notifications)
        .set({
          isRead: "true",
          readAt: sql`NOW()`,
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, user.id) // Security: only user's own notifications
          )
        );

      console.log('[Mark Read] Successfully marked as read');
      return c.json({ success: true, message: "Notification marked as read" });
    } catch (error) {
      console.error("[Mark Read] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return c.json(
        { success: false, error: "Failed to update notification", details: errorMessage },
        500
      );
    }
  })

  // Mark all notifications as read
  .patch("/mark-all-read", sessionMiddleware, async (c) => {
    try {
      const user = c.get("user");
      
      // Validate user
      if (!user?.id) {
        console.error('[Mark All Read] Invalid user session');
        return c.json({ error: "Unauthorized - Invalid session" }, 401);
      }
      
      console.log('[Mark All Read] User:', user.id, 'Marking all as read');

      const result = await db
        .update(notifications)
        .set({
          isRead: "true",
          readAt: sql`NOW()`,
        })
        .where(
          and(
            eq(notifications.userId, user.id),
            eq(notifications.isRead, "false")
          )
        )
        .returning();

      console.log('[Mark All Read] Successfully marked', result.length, 'notifications as read');

      return c.json({ 
        success: true, 
        message: "All notifications marked as read",
        count: result.length
      });
    } catch (error) {
      console.error("[Mark All Read] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("[Mark All Read] Stack:", errorStack);
      return c.json(
        { 
          success: false, 
          error: "Failed to mark notifications as read",
          details: errorMessage
        },
        500
      );
    }
  })

  // Clear all notifications (MUST come before /:notificationId)
  .delete("/clear-all", sessionMiddleware, async (c) => {
    try {
      console.log('[Clear All Notifications] Starting operation');
      
      const user = c.get("user");
      
      // Validate user session
      if (!user?.id) {
        console.error('[Clear All Notifications] Invalid user session');
        return c.json({ error: "Unauthorized - Invalid session" }, 401);
      }

      console.log('[Clear All Notifications] User:', user.id, 'Clearing all notifications');

      // Use Drizzle ORM instead of unsafe SQL
      const result = await db
        .delete(notifications)
        .where(eq(notifications.userId, user.id))
        .returning();

      console.log('[Clear All Notifications] Successfully deleted', result.length, 'notifications');

      return c.json({ 
        success: true, 
        message: "All notifications cleared",
        count: result.length
      });
    } catch (error) {
      console.error("[Clear All Notifications] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error("[Clear All Notifications] Stack:", errorStack);
      return c.json(
        { 
          success: false, 
          error: "Failed to clear notifications",
          details: errorMessage
        },
        500
      );
    }
  })

  // Delete individual notification
  .delete("/:notificationId", sessionMiddleware, async (c) => {
    try {
      const user = c.get("user");
      const { notificationId } = c.req.param();
      console.log('[Delete Notification] User:', user.id, 'Notification:', notificationId);

      await sql_client.unsafe(`DELETE FROM notifications WHERE id = '${notificationId}' AND user_id = '${user.id}'`);

      console.log('[Delete Notification] Successfully deleted');
      return c.json({ success: true, message: "Notification deleted" });
    } catch (error) {
      console.error("[Delete Notification] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return c.json(
        { success: false, error: "Failed to delete notification", details: errorMessage },
        500
      );
    }
  });

export default app;
