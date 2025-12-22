import { zValidator } from "@hono/zod-validator";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { Hono } from "hono";
import { z } from "zod";
import { eq, and, desc, gte, lte, inArray } from "drizzle-orm";

import { TaskStatus } from "@/features/tasks/types";
import { sessionMiddleware } from "@/lib/session-middleware";
import { db } from "@/db";
import { projects, tasks, members } from "@/db/schema";
import { MemberRole } from "@/features/members/types";

import { createProjectSchema, updateProjectSchema } from "../schemas";

/**
 * Check if user is admin by checking their role in any workspace
 */
async function isUserAdmin(userId: string): Promise<boolean> {
  const memberRoles = await db
    .select({ role: members.role })
    .from(members)
    .where(eq(members.userId, userId))
    .limit(1);
  
  if (memberRoles.length === 0) return false;
  
  const role = memberRoles[0].role;
  return [
    MemberRole.ADMIN,
    MemberRole.PROJECT_MANAGER,
    MemberRole.MANAGEMENT,
  ].includes(role as MemberRole);
}

const app = new Hono()
  .post(
    "/",
    sessionMiddleware,
    zValidator("form", createProjectSchema),
    async (c) => {
      const user = c.get("user");
      
      // Check if user is admin
      const adminCheck = await isUserAdmin(user.id);
      if (!adminCheck) {
        return c.json({ error: "Forbidden: Only admins can create projects" }, 403);
      }

      const { name, image, workspaceId, postDate, tentativeEndDate, assignees } = c.req.valid("form");

      // Project-centric: Any authenticated user can create projects
      // No workspace membership check needed anymore

      let uploadedImageUrl: string | undefined;
      if (image instanceof File) {
        uploadedImageUrl = undefined; // TODO: Implement image upload
      }

      const [project] = await db
        .insert(projects)
        .values({
          name,
          imageUrl: uploadedImageUrl,
          workspaceId: workspaceId || null,
          postDate: postDate ? new Date(postDate) : null,
          tentativeEndDate: tentativeEndDate ? new Date(tentativeEndDate) : null,
        })
        .returning();

      return c.json({ data: project });
    }
  )
  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string().optional() })),
    async (c) => {
      const user = c.get("user");
      const { workspaceId } = c.req.valid("query");

      // Get user's member record to check role and projectId
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.userId, user.id))
        .limit(1);

      if (!member) {
        return c.json({ data: { documents: [], total: 0 } });
      }

      let projectList;

      // CLIENT: Can only see their assigned project
      if (member.role === MemberRole.CLIENT) {
        if (!member.projectId) {
          return c.json({ data: { documents: [], total: 0 } });
        }

        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, member.projectId))
          .limit(1);

        projectList = project ? [project] : [];
      }
      // Check if user is admin
      else if ([MemberRole.ADMIN, MemberRole.PROJECT_MANAGER, MemberRole.MANAGEMENT].includes(member.role as MemberRole)) {
        // Admins: Return all projects (limited to 50 for performance)
        if (workspaceId) {
          projectList = await db
            .select()
            .from(projects)
            .where(eq(projects.workspaceId, workspaceId))
            .orderBy(desc(projects.createdAt))
            .limit(50);
        } else {
          projectList = await db
            .select()
            .from(projects)
            .orderBy(desc(projects.createdAt))
            .limit(50);
        }
      } else {
        // Employees: Return only projects where they have tasks assigned
        const userTasks = await db
          .select({ projectId: tasks.projectId })
          .from(tasks)
          .where(
            and(
              eq(tasks.assigneeId, user.id),
              // Exclude null projectIds (individual tasks)
              // @ts-ignore - SQL comparison with null
              eq(tasks.projectId, tasks.projectId)
            )
          )
          .groupBy(tasks.projectId);
        
        const projectIds = userTasks
          .map(t => t.projectId)
          .filter((id): id is string => id !== null);
        
        if (projectIds.length === 0) {
          // No projects with assigned tasks
          return c.json({ data: { documents: [], total: 0 } });
        }
        
        if (workspaceId) {
          projectList = await db
            .select()
            .from(projects)
            .where(
              and(
                eq(projects.workspaceId, workspaceId),
                inArray(projects.id, projectIds)
              )
            )
            .orderBy(desc(projects.createdAt));
        } else {
          projectList = await db
            .select()
            .from(projects)
            .where(inArray(projects.id, projectIds))
            .orderBy(desc(projects.createdAt));
        }
      }

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

    // Check if user is CLIENT with projectId restriction
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.userId, user.id))
      .limit(1);

    if (member?.role === MemberRole.CLIENT) {
      // CLIENT can only access their assigned project
      if (member.projectId !== projectId) {
        return c.json({ error: "Forbidden: You don't have access to this project" }, 403);
      }
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

      // Project-centric: Any authenticated user can edit projects

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

    // Project-centric: Any authenticated user can delete projects

    await db.delete(projects).where(eq(projects.id, projectId));

    return c.json({ data: { id: projectId } });
  })
  .post(
    "/bulk-delete",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        projectIds: z.array(z.string()).min(1, "At least one project ID is required"),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const { projectIds } = c.req.valid("json");

      console.log('🗑️ Bulk delete request:', { projectIds, userId: user.id });

      // Project-centric: Any authenticated user can delete projects
      
      // Verify all projects exist
      const existingProjects = await db
        .select()
        .from(projects)
        .where(inArray(projects.id, projectIds));

      if (existingProjects.length !== projectIds.length) {
        return c.json({ 
          error: "Some projects not found" 
        }, 404);
      }

      // Delete all projects (cascade will delete related tasks)
      await db
        .delete(projects)
        .where(inArray(projects.id, projectIds));

      console.log(`✅ Deleted ${projectIds.length} projects`);

      return c.json({ 
        data: { 
          deletedCount: projectIds.length,
          projectIds: projectIds 
        } 
      });
    }
  )
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

    // Project-centric: Any authenticated user can view analytics
    
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
          gte(tasks.created, thisMonthStart),
          lte(tasks.created, thisMonthEnd)
        )
      );

    const lastMonthTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          gte(tasks.created, lastMonthStart),
          lte(tasks.created, lastMonthEnd)
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
          gte(tasks.created, thisMonthStart),
          lte(tasks.created, thisMonthEnd)
        )
      );

    const lastMonthAssignedTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.assigneeId, user.id),
          gte(tasks.created, lastMonthStart),
          lte(tasks.created, lastMonthEnd)
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
          gte(tasks.created, thisMonthStart),
          lte(tasks.created, thisMonthEnd)
        )
      );

    const lastMonthCompletedTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          eq(tasks.status, TaskStatus.DONE),
          gte(tasks.created, lastMonthStart),
          lte(tasks.created, lastMonthEnd)
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
          gte(tasks.created, thisMonthStart),
          lte(tasks.created, thisMonthEnd)
        )
      );

    const lastMonthOverdueTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.projectId, projectId),
          lte(tasks.dueDate, lastMonthEnd),
          gte(tasks.created, lastMonthStart),
          lte(tasks.created, lastMonthEnd)
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
