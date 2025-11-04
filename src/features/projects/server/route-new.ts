import { zValidator } from "@hono/zod-validator";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, gte, lte } from "drizzle-orm";

import { getMember } from "@/features/members/utils";
import { TaskStatus } from "@/features/tasks/types";
import { sessionMiddleware } from "@/lib/session-middleware";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";

import { createProjectSchema, updateProjectSchema } from "../schemas";

const app = new Hono()
  .post(
    "/",
    sessionMiddleware,
    zValidator("form", createProjectSchema),
    async (c) => {
      const user = c.get("user");
      const { name, image, workspaceId } = c.req.valid("form");

      const member = await getMember({
        workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      let uploadedImageUrl: string | undefined;
      if (image instanceof File) {
        uploadedImageUrl = undefined; // TODO: Implement image upload
      }

      const [project] = await db
        .insert(projects)
        .values({
          name,
          imageUrl: uploadedImageUrl,
          workspaceId,
        })
        .returning();

      return c.json({ data: project });
    }
  )
  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const user = c.get("user");
      const { workspaceId } = c.req.valid("query");

      if (!workspaceId) {
        return c.json({ error: "Missing workspaceId" }, 400);
      }

      const member = await getMember({
        workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const projectList = await db
        .select()
        .from(projects)
        .where(eq(projects.workspaceId, workspaceId))
        .orderBy(desc(projects.createdAt));

      return c.json({ data: { documents: projectList, total: projectList.length } });
    }
  )
  .get("/:projectId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { projectId } = c.req.param();

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const member = await getMember({
      workspaceId: project.workspaceId,
      userId: user.id,
    });

    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    return c.json({ data: project });
  })
  .patch(
    "/:projectId",
    sessionMiddleware,
    zValidator("form", updateProjectSchema),
    async (c) => {
      const user = c.get("user");
      const { projectId } = c.req.param();
      const { name, image } = c.req.valid("form");

      const [existingProject] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!existingProject) {
        return c.json({ error: "Project not found" }, 404);
      }

      const member = await getMember({
        workspaceId: existingProject.workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      let uploadedImageUrl: string | undefined;
      if (image instanceof File) {
        uploadedImageUrl = undefined; // TODO: Implement image upload
      } else {
        uploadedImageUrl = image;
      }

      const [project] = await db
        .update(projects)
        .set({
          name,
          imageUrl: uploadedImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))
        .returning();

      return c.json({ data: project });
    }
  )
  .delete("/:projectId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { projectId } = c.req.param();

    const [existingProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!existingProject) {
      return c.json({ error: "Project not found" }, 404);
    }

    const member = await getMember({
      workspaceId: existingProject.workspaceId,
      userId: user.id,
    });

    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await db.delete(projects).where(eq(projects.id, projectId));

    return c.json({ data: { id: projectId } });
  })
  .get("/:projectId/analytics", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { projectId } = c.req.param();

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const member = await getMember({
      workspaceId: project.workspaceId,
      userId: user.id,
    });

    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          gte(tasks.createdAt, thisMonthStart),
          lte(tasks.createdAt, thisMonthEnd)
        )
      );

    const lastMonthTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          gte(tasks.createdAt, lastMonthStart),
          lte(tasks.createdAt, lastMonthEnd)
        )
      );

    const taskCount = thisMonthTasks.length;
    const taskDifference = taskCount - lastMonthTasks.length;

    const thisMonthAssignedTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.assigneeId, user.id),
          gte(tasks.createdAt, thisMonthStart),
          lte(tasks.createdAt, thisMonthEnd)
        )
      );

    const lastMonthAssignedTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.assigneeId, user.id),
          gte(tasks.createdAt, lastMonthStart),
          lte(tasks.createdAt, lastMonthEnd)
        )
      );

    const assignedTaskCount = thisMonthAssignedTasks.length;
    const assignedTaskDifference = assignedTaskCount - lastMonthAssignedTasks.length;

    const thisMonthCompletedTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.status, TaskStatus.DONE),
          gte(tasks.createdAt, thisMonthStart),
          lte(tasks.createdAt, thisMonthEnd)
        )
      );

    const lastMonthCompletedTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.status, TaskStatus.DONE),
          gte(tasks.createdAt, lastMonthStart),
          lte(tasks.createdAt, lastMonthEnd)
        )
      );

    const completedTaskCount = thisMonthCompletedTasks.length;
    const completedTaskDifference = completedTaskCount - lastMonthCompletedTasks.length;

    const thisMonthOverdueTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          lte(tasks.dueDate, now),
          gte(tasks.createdAt, thisMonthStart),
          lte(tasks.createdAt, thisMonthEnd)
        )
      );

    const lastMonthOverdueTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          lte(tasks.dueDate, lastMonthEnd),
          gte(tasks.createdAt, lastMonthStart),
          lte(tasks.createdAt, lastMonthEnd)
        )
      );

    const overdueTaskCount = thisMonthOverdueTasks.length;
    const overdueTaskDifference = overdueTaskCount - lastMonthOverdueTasks.length;

    return c.json({
      data: {
        taskCount,
        taskDifference,
        assignedTaskCount,
        assignedTaskDifference,
        completedTaskCount,
        completedTaskDifference,
        overdueTaskCount,
        overdueTaskDifference,
      },
    });
  });

export default app;
