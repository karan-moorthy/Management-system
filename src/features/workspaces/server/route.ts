import { Hono } from "hono";
import { eq, desc, inArray, and, gte, lte, count, sql } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { sessionMiddleware } from "@/lib/session-middleware";
import { db } from "@/db";
import { workspaces, members, tasks, projects } from "@/db/schema";
import { getMember } from "@/features/members/utils";
import { generateInviteCode } from "@/lib/utils";
import { MemberRole } from "@/features/members/types";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../schemas";
import { TaskStatus } from "@/features/tasks/types";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";

const app = new Hono()
  // List all workspaces for current user
  .get("/", sessionMiddleware, async (c) => {
    const user = c.get("user");

    // Get all memberships for this user
    const userMembers = await db
      .select()
      .from(members)
      .where(eq(members.userId, user.id));

    if (userMembers.length === 0) {
      return c.json({ data: { documents: [], total: 0 } });
    }

    const workspaceIds = userMembers.map((member) => member.workspaceId);

    // Get all workspaces user is a member of
    const userWorkspaces = await db
      .select()
      .from(workspaces)
      .where(inArray(workspaces.id, workspaceIds))
      .orderBy(desc(workspaces.createdAt));

    return c.json({ 
      data: { 
        documents: userWorkspaces,
        total: userWorkspaces.length 
      } 
    });
  })
  
  // Get single workspace
  .get("/:workspaceId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { workspaceId } = c.req.param();

    const member = await getMember({
      workspaceId,
      userId: user.id,
    });

    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    return c.json({ data: workspace });
  })
  
  // Get workspace info
  .get("/:workspaceId/info", sessionMiddleware, async (c) => {
    const { workspaceId } = c.req.param();

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    return c.json({
      data: {
        id: workspace.id,
        name: workspace.name,
        imageUrl: workspace.imageUrl,
      },
    });
  })

  // Create workspace
  .post(
    "/",
    zValidator("form", createWorkspaceSchema),
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const { name, image } = c.req.valid("form");

      let uploadedImageUrl: string | undefined;

      // TODO: Handle image upload (skip for now)
      if (image instanceof File) {
        // For now, we'll skip image upload
        // You can add local file storage or cloud storage (S3, Cloudinary) later
        uploadedImageUrl = undefined;
      }

      // Create workspace
      const [workspace] = await db
        .insert(workspaces)
        .values({
          name,
          userId: user.id,
          imageUrl: uploadedImageUrl,
          inviteCode: generateInviteCode(6),
        })
        .returning();

      // Add creator as admin member
      await db.insert(members).values({
        userId: user.id,
        workspaceId: workspace.id,
        role: MemberRole.ADMIN,
      });

      return c.json({ data: workspace });
    }
  )

  // Update workspace
  .patch(
    "/:workspaceId",
    sessionMiddleware,
    zValidator("form", updateWorkspaceSchema),
    async (c) => {
      const user = c.get("user");
      const { workspaceId } = c.req.param();
      const { name, image } = c.req.valid("form");

      const member = await getMember({
        workspaceId,
        userId: user.id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      let uploadedImageUrl: string | undefined;

      // TODO: Handle image upload (skip for now)
      if (image instanceof File) {
        uploadedImageUrl = undefined;
      } else {
        uploadedImageUrl = image;
      }

      const [workspace] = await db
        .update(workspaces)
        .set({
          name,
          imageUrl: uploadedImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(workspaces.id, workspaceId))
        .returning();

      return c.json({ data: workspace });
    }
  )

  // Delete workspace
  .delete("/:workspaceId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { workspaceId } = c.req.param();

    const member = await getMember({
      workspaceId,
      userId: user.id,
    });

    if (!member || member.role !== MemberRole.ADMIN) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Delete workspace (cascade will handle members, projects, tasks)
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));

    return c.json({ data: { id: workspaceId } });
  })

  // Reset invite code
  .post("/:workspaceId/reset-invite-code", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { workspaceId } = c.req.param();

    const member = await getMember({
      workspaceId,
      userId: user.id,
    });

    if (!member || member.role !== MemberRole.ADMIN) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [workspace] = await db
      .update(workspaces)
      .set({
        inviteCode: generateInviteCode(6),
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    return c.json({ data: workspace });
  })

  // Join workspace with invite code
  .post(
    "/:workspaceId/join",
    sessionMiddleware,
    zValidator("json", z.object({ code: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.param();
      const { code } = c.req.valid("json");
      const user = c.get("user");

      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      if (workspace.inviteCode !== code) {
        return c.json({ error: "Invalid invite code" }, 400);
      }

      // Check if already a member
      const existingMember = await getMember({
        workspaceId,
        userId: user.id,
      });

      if (existingMember) {
        return c.json({ error: "Already a member of this workspace" }, 400);
      }

      // Add as member
      await db.insert(members).values({
        userId: user.id,
        workspaceId: workspace.id,
        role: MemberRole.MEMBER,
      });

      return c.json({ data: workspace });
    }
  )

  // Get workspace analytics
  .get("/:workspaceId/analytics", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { workspaceId } = c.req.param();

    const member = await getMember({
      workspaceId,
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

    // Get this month's tasks count (excluding individual tasks)
    const [thisMonthTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          sql`${tasks.projectId} IS NOT NULL`, // Exclude individual tasks
          gte(tasks.created, thisMonthStart),
          lte(tasks.created, thisMonthEnd)
        )
      );

    // Get last month's tasks count (excluding individual tasks)
    const [lastMonthTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          sql`${tasks.projectId} IS NOT NULL`, // Exclude individual tasks
          gte(tasks.created, lastMonthStart),
          lte(tasks.created, lastMonthEnd)
        )
      );

    const taskCount = thisMonthTasksResult.count;
    const taskDifference = taskCount - lastMonthTasksResult.count;

    // Get this month's assigned tasks count
    const [thisMonthAssignedTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          eq(tasks.assigneeId, user.id),
          gte(tasks.created, thisMonthStart),
          lte(tasks.created, thisMonthEnd)
        )
      );

    // Get last month's assigned tasks count
    const [lastMonthAssignedTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          eq(tasks.assigneeId, user.id),
          gte(tasks.created, lastMonthStart),
          lte(tasks.created, lastMonthEnd)
        )
      );

    const assignedTaskCount = thisMonthAssignedTasksResult.count;
    const assignedTaskDifference =
      assignedTaskCount - lastMonthAssignedTasksResult.count;

    // Get this month's completed tasks count (excluding individual tasks)
    const [thisMonthCompletedTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          sql`${tasks.projectId} IS NOT NULL`, // Exclude individual tasks
          eq(tasks.status, TaskStatus.DONE),
          gte(tasks.created, thisMonthStart),
          lte(tasks.created, thisMonthEnd)
        )
      );

    // Get last month's completed tasks count (excluding individual tasks)
    const [lastMonthCompletedTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          sql`${tasks.projectId} IS NOT NULL`, // Exclude individual tasks
          eq(tasks.status, TaskStatus.DONE),
          gte(tasks.created, lastMonthStart),
          lte(tasks.created, lastMonthEnd)
        )
      );

    const completedTaskCount = thisMonthCompletedTasksResult.count;
    const completedTaskDifference =
      completedTaskCount - lastMonthCompletedTasksResult.count;

    // Get this month's overdue tasks count (excluding individual tasks)
    const [thisMonthOverdueTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          sql`${tasks.projectId} IS NOT NULL`, // Exclude individual tasks
          lte(tasks.dueDate, now),
          gte(tasks.created, thisMonthStart),
          lte(tasks.created, thisMonthEnd)
        )
      );

    // Get last month's overdue tasks count (excluding individual tasks)
    const [lastMonthOverdueTasksResult] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.workspaceId, workspaceId),
          sql`${tasks.projectId} IS NOT NULL`, // Exclude individual tasks
          lte(tasks.dueDate, lastMonthEnd),
          gte(tasks.created, lastMonthStart),
          lte(tasks.created, lastMonthEnd)
        )
      );

    const overdueTaskCount = thisMonthOverdueTasksResult.count;
    const overdueTaskDifference = overdueTaskCount - lastMonthOverdueTasksResult.count;

    // Calculate incomplete tasks (all tasks except DONE)
    const incompleteTaskCount = taskCount - completedTaskCount;
    const incompleteTaskDifference = taskDifference - completedTaskDifference;

    return c.json({
      data: {
        taskCount,
        taskDifference,
        assignedTaskCount,
        assignedTaskDifference,
        completedTaskCount,
        completedTaskDifference,
        incompleteTaskCount,
        incompleteTaskDifference,
        overdueTaskCount,
        overdueTaskDifference,
      },
    });
  });
  
export default app;
