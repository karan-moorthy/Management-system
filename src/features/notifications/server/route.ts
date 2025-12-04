import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";

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
      const [notification] = await db
        .update(notifications)
        .set({
          isRead: "true",
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, user.id)
          )
        )
        .returning();

      if (!notification) {
        return c.json(
          { success: false, message: "Notification not found" },
          404
        );
      }

      return c.json({ success: true, data: notification });
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
      await db
        .update(notifications)
        .set({
          isRead: "true",
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.userId, user.id),
            eq(notifications.isRead, "false")
          )
        );

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
      const deletedNotifications = await db
        .delete(notifications)
        .where(eq(notifications.userId, user.id))
        .returning();

      console.log('[Clear All Notifications] Deleted', deletedNotifications.length, 'notifications');

      return c.json({ success: true, count: deletedNotifications.length });
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
      const [deleted] = await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, user.id)
          )
        )
        .returning();

      if (!deleted) {
        return c.json(
          { success: false, message: "Notification not found" },
          404
        );
      }

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
