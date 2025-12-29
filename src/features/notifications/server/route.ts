import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { sessionMiddleware } from "@/lib/session-middleware";

const app = new Hono()
  // Get user's notifications
  .get("/", sessionMiddleware, async (c) => {
    const user = c.get("user");

    try {
      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(50);

      return c.json({ success: true, data: userNotifications });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      return c.json(
        { success: false, message: "Failed to fetch notifications" },
        500
      );
    }
  })

  // Mark notification as read
  .patch("/:notificationId/read", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { notificationId } = c.req.param();

    try {
      const updateResult = await db
        .update(notifications)
        .set({
          isRead: "true",
          readAt: sql`NOW()`,
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, user.id)
          )
        )
        .execute();

      return c.json({ success: true });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      return c.json(
        { success: false, message: "Failed to update notification" },
        500
      );
    }
  })

  // Mark all notifications as read
  .patch("/mark-all-read", sessionMiddleware, async (c) => {
    const user = c.get("user");

    try {
      const updateResult = await db
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
        .execute();

      return c.json({ success: true });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      return c.json(
        { success: false, message: "Failed to update notifications" },
        500
      );
    }
  })

  // Clear all notifications (MUST come before /:notificationId)
  .delete("/clear-all", sessionMiddleware, async (c) => {
    const user = c.get("user");

    console.log('[Clear All Notifications] User:', user.id, 'Clearing all notifications');

    try {
      const deleteResult = await db
        .delete(notifications)
        .where(eq(notifications.userId, user.id))
        .execute();

      console.log('[Clear All Notifications] Deletion completed');

      return c.json({ success: true });
    } catch (error) {
      console.error("Failed to clear notifications:", error);
      return c.json(
        { success: false, message: "Failed to clear notifications" },
        500
      );
    }
  })

  // Delete individual notification
  .delete("/:notificationId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { notificationId } = c.req.param();

    try {
      const deleteResult = await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, user.id)
          )
        )
        .execute();

      return c.json({ success: true });
    } catch (error) {
      console.error("Failed to delete notification:", error);
      return c.json(
        { success: false, message: "Failed to delete notification" },
        500
      );
    }
  });

export default app;
