import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { desc, eq, and, sql } from "drizzle-orm";

import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { sessionMiddleware } from "@/lib/session-middleware";

const app = new Hono()
  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({
      workspaceId: z.string().optional(),
      taskId: z.string().optional(),
      projectId: z.string().optional(),
      entityType: z.string().optional(),
      actionType: z.string().optional(),
      limit: z.string().optional(),
      offset: z.string().optional(),
    })),
    async (c) => {
      const user = c.get("user");
      const { 
        workspaceId, 
        taskId, 
        projectId, 
        entityType, 
        actionType,
        limit = "50",
        offset = "0"
      } = c.req.valid("query");

      const startTime = performance.now();

      // Build query conditions
      const conditions = [];
      
      if (workspaceId) {
        conditions.push(eq(activityLogs.workspaceId, workspaceId));
      }
      if (taskId) {
        conditions.push(eq(activityLogs.taskId, taskId));
      }
      if (projectId) {
        conditions.push(eq(activityLogs.projectId, projectId));
      }
      if (entityType) {
        conditions.push(eq(activityLogs.entityType, entityType));
      }
      if (actionType) {
        conditions.push(eq(activityLogs.actionType, actionType));
      }

      // Fetch activity logs with pagination
      const logs = await db
        .select()
        .from(activityLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(activityLogs.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(activityLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const fetchTime = performance.now() - startTime;
      console.log(`✅ Fetched ${logs.length} activity logs in ${fetchTime.toFixed(2)}ms`);

      return c.json({
        data: {
          documents: logs,
          total: Number(count),
        },
      });
    }
  )
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", z.object({
      actionType: z.string(),
      entityType: z.string(),
      entityId: z.string(),
      workspaceId: z.string().optional(),
      projectId: z.string().optional().nullable(),
      taskId: z.string().optional().nullable(),
      changes: z.object({
        field: z.string().optional(),
        oldValue: z.string().optional().nullable(),
        newValue: z.string().optional().nullable(),
        description: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      }).optional(),
      summary: z.string(),
    })),
    async (c) => {
      const user = c.get("user");
      const data = c.req.valid("json");

      const [newLog] = await db
        .insert(activityLogs)
        .values({
          ...data,
          userId: user.id,
          userName: user.name,
        })
        .returning();

      console.log(`📝 Activity logged: ${data.actionType} by ${user.name}`);

      return c.json({ data: newLog });
    }
  )
  // Get activity logs for a specific task (detailed history)
  .get(
    "/task/:taskId",
    sessionMiddleware,
    async (c) => {
      const { taskId } = c.param();

      const logs = await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.taskId, taskId))
        .orderBy(desc(activityLogs.createdAt));

      return c.json({ data: logs });
    }
  )
  // Get recent activity for workspace (Jira-style)
  .get(
    "/recent/:workspaceId",
    sessionMiddleware,
    zValidator("query", z.object({
      limit: z.string().optional(),
    })),
    async (c) => {
      const { workspaceId } = c.param();
      const { limit = "20" } = c.req.valid("query");

      const logs = await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.workspaceId, workspaceId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(parseInt(limit));

      return c.json({ data: logs });
    }
  );

export default app;
