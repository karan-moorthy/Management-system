import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, or, like, sql } from "drizzle-orm";

import { sessionMiddleware } from "@/lib/session-middleware";
import { db } from "@/db";
import { tasks, projects, users } from "@/db/schema";
import { getMember } from "@/features/members/utils";

import { createTaskSchema } from "../schemas";
import { TaskStatus } from "../types";

const app = new Hono()
  .delete("/:taskId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { taskId } = c.req.param();

    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    const member = await getMember({
      workspaceId: task.workspaceId,
      userId: user.id,
    });

    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await db.delete(tasks).where(eq(tasks.id, taskId));

    return c.json({ data: { id: task.id } });
  })
  .get(
    "/",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({
        workspaceId: z.string(),
        projectId: z.string().nullish(),
        assigneeId: z.string().nullish(),
        status: z.nativeEnum(TaskStatus).nullish(),
        search: z.string().nullish(),
        dueDate: z.string().nullish(),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const { workspaceId, projectId, assigneeId, status, search, dueDate } =
        c.req.valid("query");

      const member = await getMember({
        workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Build where conditions
      const conditions = [eq(tasks.workspaceId, workspaceId)];

      if (projectId) {
        conditions.push(eq(tasks.projectId, projectId));
      }

      if (status) {
        conditions.push(eq(tasks.status, status));
      }

      if (assigneeId) {
        conditions.push(eq(tasks.assigneeId, assigneeId));
      }

      if (dueDate) {
        conditions.push(eq(tasks.dueDate, new Date(dueDate)));
      }

      if (search) {
        conditions.push(
          or(
            like(tasks.name, `%${search}%`),
            like(tasks.description, `%${search}%`)
          )!
        );
      }

      const taskList = await db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt));

      // Get unique assignee and project IDs
      const assigneeIds = Array.from(new Set(taskList.map((t) => t.assigneeId)));
      const projectIds = Array.from(new Set(taskList.map((t) => t.projectId)));

      // Fetch assignees
      const assignees = assigneeIds.length > 0
        ? await db.select().from(users).where(sql`${users.id} = ANY(${assigneeIds})`)
        : [];

      // Fetch projects  
      const projectsData = projectIds.length > 0
        ? await db.select().from(projects).where(sql`${projects.id} = ANY(${projectIds})`)
        : [];

      // Populate tasks with assignee and project data
      const populatedTasks = taskList.map((task) => ({
        ...task,
        assignee: assignees.find((a) => a.id === task.assigneeId),
        project: projectsData.find((p) => p.id === task.projectId),
      }));

      return c.json({
        data: {
          documents: populatedTasks,
          total: populatedTasks.length,
        },
      });
    }
  )
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", createTaskSchema),
    async (c) => {
      const user = c.get("user");
      const {
        name,
        status,
        workspaceId,
        projectId,
        dueDate,
        assigneeId,
        description,
        priority,
        importance,
        category,
        estimatedHours,
      } = c.req.valid("json");

      const member = await getMember({
        workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get highest position
      const [highestPositionTask] = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.workspaceId, workspaceId),
            eq(tasks.status, status)
          )
        )
        .orderBy(desc(tasks.position))
        .limit(1);

      const newPosition = highestPositionTask
        ? highestPositionTask.position + 1000
        : 1000;

      const [task] = await db
        .insert(tasks)
        .values({
          name,
          description,
          status,
          priority,
          importance,
          category,
          estimatedHours,
          workspaceId,
          projectId,
          dueDate: new Date(dueDate),
          assigneeId,
          position: newPosition,
        })
        .returning();

      return c.json({ data: task });
    }
  )
  .patch(
    "/:taskId",
    sessionMiddleware,
    zValidator("json", createTaskSchema.partial()),
    async (c) => {
      const user = c.get("user");
      const { taskId } = c.req.param();
      const updates = c.req.valid("json");

      const [existingTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (!existingTask) {
        return c.json({ error: "Task not found" }, 404);
      }

      const member = await getMember({
        workspaceId: existingTask.workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const [task] = await db
        .update(tasks)
        .set({
          ...updates,
          dueDate: updates.dueDate ? new Date(updates.dueDate) : existingTask.dueDate,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      return c.json({ data: task });
    }
  )
  .get("/:taskId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { taskId } = c.req.param();

    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    const member = await getMember({
      workspaceId: task.workspaceId,
      userId: user.id,
    });

    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    return c.json({ data: task });
  })
  .post(
    "/bulk-update",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        tasks: z.array(
          z.object({
            id: z.string(),
            status: z.nativeEnum(TaskStatus),
            position: z.number().int().positive().min(1000).max(1_000_000),
          })
        ),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const { tasks: tasksToUpdate } = c.req.valid("json");

      // Get all tasks and verify authorization
      const taskIds = tasksToUpdate.map((t) => t.id);
      const existingTasks = await db
        .select()
        .from(tasks)
        .where(sql`${tasks.id} = ANY(${taskIds})`);

      if (existingTasks.length !== tasksToUpdate.length) {
        return c.json({ error: "Some tasks not found" }, 404);
      }

      // Verify user has access to workspace
      const workspaceIds = Array.from(new Set(existingTasks.map((t) => t.workspaceId)));
      
      for (const workspaceId of workspaceIds) {
        const member = await getMember({
          workspaceId,
          userId: user.id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }
      }

      // Update all tasks
      const updatedTasks = [];
      for (const taskUpdate of tasksToUpdate) {
        const [updated] = await db
          .update(tasks)
          .set({
            status: taskUpdate.status,
            position: taskUpdate.position,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, taskUpdate.id))
          .returning();
        
        updatedTasks.push(updated);
      }

      return c.json({ data: updatedTasks });
    }
  );

export default app;
