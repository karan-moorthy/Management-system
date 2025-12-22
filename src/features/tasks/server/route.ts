import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, or, like, sql, inArray, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { sessionMiddleware } from "@/lib/session-middleware";
import { db } from "@/db";
import { tasks, projects, users, activityLogs, members, notifications, listViewColumns } from "@/db/schema";
import { getMember } from "@/features/members/utils";
import { MemberRole } from "@/features/members/types";
import { ActivityAction, EntityType } from "@/features/activity/types";

import { createTaskSchema } from "../schemas";
import { TaskStatus, TaskPriority, IssueType, Resolution } from "../types";

/**
 * Generate a human-readable batch ID
 * Format: PROJECTNAME_YYYYMMDD_HHMMSS_XXX
 * Example: BENZ_20251111_143052_A7B
 */
function generateReadableBatchId(projectName: string): string {
  const now = new Date();
  
  // Format: YYYYMMDD
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Format: HHMMSS
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
  
  // Generate random 3-character suffix (A-Z, 0-9)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 3 }, () => 
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  
  // Clean project name (uppercase, replace spaces/special chars with underscore, max 10 chars)
  const cleanName = projectName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .slice(0, 10);
  
  return `${cleanName}_${date}_${time}_${suffix}`;
}

/**
 * Generate a sequential batch ID
 * Format: BATCH_NNNNNN (6-digit number)
 * Example: BATCH_001234
 */
async function generateSequentialBatchId(projectId: string): Promise<string> {
  // Get the count of existing batches for this project
  const [result] = await db
    .select({ count: sql<number>`count(DISTINCT upload_batch_id)` })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));
  
  const nextNumber = (result?.count || 0) + 1;
  return `BATCH_${String(nextNumber).padStart(6, '0')}`;
}

/**
 * Generate a custom format batch ID
 * Format: [PROJECT_CODE]-[USER_INITIALS]-[TIMESTAMP]
 * Example: BNZ-AK-20251111143052
 */
function generateCustomBatchId(projectName: string, userName: string): string {
  const now = new Date();
  
  // Project code (first 3 letters)
  const projectCode = projectName
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
    .padEnd(3, 'X');
  
  // User initials (first letter of first and last name)
  const nameParts = userName.split(' ');
  const initials = nameParts.length >= 2
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
    : userName.slice(0, 2).toUpperCase();
  
  // Timestamp: YYYYMMDDHHmmss
  const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
  
  return `${projectCode}-${initials}-${timestamp}`;
}

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

    // Only check workspace membership if workspaceId exists
    if (task.workspaceId) {
      const member = await getMember({
        workspaceId: task.workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // RBAC: Permission checks
      const role = member.role as MemberRole;
      const allowedRoles = [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER];
      
      // Admins and Project Managers can delete any task
      if (allowedRoles.includes(role)) {
        // Allow deletion
      } 
      // Employees can ONLY delete their own individual tasks (no project)
      else if (role === MemberRole.EMPLOYEE) {
        if (task.projectId !== null || task.assigneeId !== user.id) {
          return c.json({ 
            error: "Forbidden: You can only delete your own individual tasks" 
          }, 403);
        }
      } 
      // Other roles cannot delete tasks
      else {
        return c.json({ 
          error: "Forbidden: Only admins and project managers can delete tasks" 
        }, 403);
      }
    }
    // For tasks without workspace (CSV uploads), allow deletion by any authenticated user
    // In production, you might want to add additional checks here

    await db.delete(tasks).where(eq(tasks.id, taskId));

    // Log task deletion activity
    try {
      await db.insert(activityLogs).values({
        actionType: ActivityAction.TASK_DELETED,
        entityType: EntityType.TASK,
        entityId: task.id,
        userId: user.id,
        userName: user.name,
        workspaceId: task.workspaceId || null,
        projectId: task.projectId || null,
        taskId: task.id,
        summary: `${user.name} deleted task "${task.summary}"`,
        changes: {
          metadata: {
            taskSummary: task.summary,
            taskStatus: task.status,
            taskIssueId: task.issueId,
          },
        },
      });
    } catch (error) {
      console.error('Failed to log task deletion activity:', error);
    }

    return c.json({ data: { id: task.id } });
  })
  .get(
    "/",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({
        workspaceId: z.string().optional(),
        projectId: z.string().nullish(),
        assigneeId: z.string().nullish(),
        status: z.nativeEnum(TaskStatus).nullish(),
        search: z.string().nullish(),
        dueDate: z.string().nullish(),
        month: z.string().nullish(),
        week: z.string().nullish(),
        limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
        offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const { workspaceId, projectId, assigneeId, status, search, dueDate, month, week, limit, offset } =
        c.req.valid("query");

      // Check user's role to determine access level
      let isAdmin = false;
      let clientProjectId: string | null = null;
      
      if (workspaceId) {
        const member = await getMember({
          workspaceId,
          userId: user.id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        // Check if user is admin
        isAdmin = [
          MemberRole.ADMIN,
          MemberRole.PROJECT_MANAGER,
          MemberRole.MANAGEMENT,
        ].includes(member.role as MemberRole);
        
        // Check if user is CLIENT and get their assigned project
        if (member.role === MemberRole.CLIENT && member.projectId) {
          clientProjectId = member.projectId;
        }
      } else {
        // No workspace context - check role in ANY workspace
        const [userMember] = await db
          .select({ role: members.role, projectId: members.projectId })
          .from(members)
          .where(eq(members.userId, user.id))
          .limit(1);
        
        if (userMember) {
          isAdmin = [
            MemberRole.ADMIN,
            MemberRole.PROJECT_MANAGER,
            MemberRole.MANAGEMENT,
          ].includes(userMember.role as MemberRole);
          
          // Check if user is CLIENT and get their assigned project
          if (userMember.role === MemberRole.CLIENT && userMember.projectId) {
            clientProjectId = userMember.projectId;
          }
        }
      }

      // Build where conditions
      const conditions = [];
      
      // RBAC: Handle different role access patterns
      if (clientProjectId) {
        // CLIENT: can only see tasks from their assigned project
        console.log(`👥 Client query for project: ${clientProjectId}`);
        conditions.push(eq(tasks.projectId, clientProjectId));
      } else if (!isAdmin) {
        // EMPLOYEE: can only see their own tasks (assigned to them)
        console.log(`👤 Employee query for user: ${user.id}`);
        conditions.push(eq(tasks.assigneeId, user.id));
        // Employees see both workspace tasks AND individual tasks (workspaceId = null)
        // Don't filter by workspaceId for employees to include individual tasks
      } else {
        // Admins should NOT see individual tasks (projectId is null)
        // Individual tasks are private to employees
        console.log(`👨‍💼 Admin query - excluding individual tasks`);
        conditions.push(sql`${tasks.projectId} IS NOT NULL`);
        
        // Only filter by workspace for admins
        if (workspaceId) {
          conditions.push(eq(tasks.workspaceId, workspaceId));
        }
      }

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

      // Month filter
      if (month) {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        if (month === "current") {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (month === "last") {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (month === "next") {
          startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        }

        if (startDate! && endDate!) {
          conditions.push(
            and(
              gte(tasks.dueDate, startDate),
              lte(tasks.dueDate, endDate)
            )!
          );
        }
      }

      // Week filter
      if (week) {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        const getWeekBounds = (date: Date) => {
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
          const monday = new Date(date.setDate(diff));
          monday.setHours(0, 0, 0, 0);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);
          return { monday, sunday };
        };

        if (week === "current") {
          const bounds = getWeekBounds(new Date(now));
          startDate = bounds.monday;
          endDate = bounds.sunday;
        } else if (week === "last") {
          const lastWeek = new Date(now);
          lastWeek.setDate(lastWeek.getDate() - 7);
          const bounds = getWeekBounds(lastWeek);
          startDate = bounds.monday;
          endDate = bounds.sunday;
        } else if (week === "next") {
          const nextWeek = new Date(now);
          nextWeek.setDate(nextWeek.getDate() + 7);
          const bounds = getWeekBounds(nextWeek);
          startDate = bounds.monday;
          endDate = bounds.sunday;
        }

        if (startDate! && endDate!) {
          conditions.push(
            and(
              gte(tasks.dueDate, startDate),
              lte(tasks.dueDate, endDate)
            )!
          );
        }
      }

      if (search) {
        conditions.push(
          or(
            like(tasks.summary, `%${search}%`),
            like(tasks.description, `%${search}%`)
          )!
        );
      }

      // Optimized query with JOINs to fetch all data in one query
      // Create aliases for multiple user joins (assignee, reporter, creator)
      const assigneeUser = alias(users, 'assignee_user');
      const reporterUser = alias(users, 'reporter_user');
      const creatorUser = alias(users, 'creator_user');
      
      const taskList = await db
        .select({
          // Task fields
          id: tasks.id,
          summary: tasks.summary,
          issueId: tasks.issueId,
          issueType: tasks.issueType,
          status: tasks.status,
          projectName: tasks.projectName,
          priority: tasks.priority,
          resolution: tasks.resolution,
          parentTaskId: tasks.parentTaskId, // ✅ ADDED: Include parentTaskId for hierarchy
          assigneeId: tasks.assigneeId,
          reporterId: tasks.reporterId,
          creatorId: tasks.creatorId,
          created: tasks.created,
          updated: tasks.updated,
          resolved: tasks.resolved,
          dueDate: tasks.dueDate,
          labels: tasks.labels,
          description: tasks.description,
          projectId: tasks.projectId,
          workspaceId: tasks.workspaceId,
          uploadBatchId: tasks.uploadBatchId,
          uploadedAt: tasks.uploadedAt,
          uploadedBy: tasks.uploadedBy,
          estimatedHours: tasks.estimatedHours,
          actualHours: tasks.actualHours,
          position: tasks.position,
          customFields: tasks.customFields, // ✅ CRITICAL: Include customFields for Sprint, Comments, etc.
          // Assignee fields (nullable)
          assigneeName: assigneeUser.name,
          assigneeEmail: assigneeUser.email,
          assigneeImage: assigneeUser.image,
          // Reporter fields (nullable)
          reporterName: reporterUser.name,
          reporterEmail: reporterUser.email,
          reporterImage: reporterUser.image,
          // Creator fields (nullable)
          creatorName: creatorUser.name,
          creatorEmail: creatorUser.email,
          creatorImage: creatorUser.image,
          // Project fields (nullable)
          projectImageUrl: projects.imageUrl,
        })
        .from(tasks)
        .leftJoin(assigneeUser, eq(tasks.assigneeId, assigneeUser.id))
        .leftJoin(reporterUser, eq(tasks.reporterId, reporterUser.id))
        .leftJoin(creatorUser, eq(tasks.creatorId, creatorUser.id))
        .leftJoin(projects, eq(tasks.projectId, projects.id))
        .where(and(...conditions))
        .orderBy(desc(tasks.created))
        .limit(Math.min(limit || 100, 2000)) // Max 2000 tasks per request to support large CSV uploads
        .offset(offset || 0);

      // Transform the flat result into the expected structure
      const populatedTasks = taskList.map((row) => ({
        id: row.id,
        summary: row.summary,
        issueId: row.issueId,
        issueType: row.issueType,
        status: row.status,
        projectName: row.projectName,
        priority: row.priority,
        resolution: row.resolution,
        parentTaskId: row.parentTaskId, // ✅ ADDED: Include parentTaskId in response
        assigneeId: row.assigneeId,
        reporterId: row.reporterId,
        creatorId: row.creatorId,
        created: row.created,
        updated: row.updated,
        resolved: row.resolved,
        dueDate: row.dueDate,
        labels: row.labels,
        description: row.description,
        projectId: row.projectId,
        workspaceId: row.workspaceId,
        uploadBatchId: row.uploadBatchId,
        uploadedAt: row.uploadedAt,
        uploadedBy: row.uploadedBy,
        estimatedHours: row.estimatedHours,
        actualHours: row.actualHours,
        position: row.position,
        customFields: row.customFields, // ✅ CRITICAL: Pass customFields to frontend
        // Only include assignee if exists
        assignee: row.assigneeId ? {
          id: row.assigneeId,
          name: row.assigneeName,
          email: row.assigneeEmail,
          image: row.assigneeImage,
        } : undefined,
        // Only include reporter if exists
        reporter: row.reporterId ? {
          id: row.reporterId,
          name: row.reporterName,
          email: row.reporterEmail,
          image: row.reporterImage,
        } : undefined,
        // Only include creator if exists
        creator: row.creatorId ? {
          id: row.creatorId,
          name: row.creatorName,
          email: row.creatorEmail,
          image: row.creatorImage,
        } : undefined,
        // Only include project if exists
        project: row.projectId ? {
          id: row.projectId,
          name: row.projectName,
          imageUrl: row.projectImageUrl,
        } : undefined,
      }));

      console.log(`📊 Query returned ${populatedTasks.length} tasks for ${isAdmin ? 'admin' : 'employee'}`);
      if (populatedTasks.length > 0) {
        console.log(`📋 Sample task: ID=${populatedTasks[0].id}, Summary=${populatedTasks[0].summary}, ProjectId=${populatedTasks[0].projectId}, WorkspaceId=${populatedTasks[0].workspaceId}`);
      }

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
        summary,
        issueId,
        issueType,
        status,
        projectName,
        workspaceId,
        projectId,
        parentTaskId,
        dueDate,
        assigneeId,
        reporterId,
        creatorId,
        description,
        priority,
        resolution,
        estimatedHours,
        labels,
      } = c.req.valid("json");

      // Skip workspace checks since workspace concept removed
      if (workspaceId) {
        const member = await getMember({
          workspaceId,
          userId: user.id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        // RBAC: MANAGEMENT and CLIENT cannot create tasks
        if (member.role === MemberRole.MANAGEMENT) {
          return c.json({ error: "Forbidden: Management role cannot create tasks" }, 403);
        }
        
        if (member.role === MemberRole.CLIENT) {
          return c.json({ error: "Forbidden: Client role cannot create tasks" }, 403);
        }
      }

      // Get highest position by projectId (or by user for personal tasks)
      const positionQuery = projectId 
        ? and(eq(tasks.projectId, projectId), eq(tasks.status, status))
        : and(eq(tasks.assigneeId, assigneeId || user.id), eq(tasks.status, status));
      
      const [highestPositionTask] = await db
        .select()
        .from(tasks)
        .where(positionQuery)
        .orderBy(desc(tasks.position))
        .limit(1);

      const newPosition = highestPositionTask
        ? highestPositionTask.position + 1000
        : 1000;

      // Generate unique issue ID if not provided or if duplicate
      let finalIssueId = issueId;
      if (!finalIssueId) {
        // Auto-generate simple unique number with AUTO- prefix
        // Get the highest existing AUTO-* issue ID to avoid collisions
        const existingTasks = await db
          .select({ issueId: tasks.issueId })
          .from(tasks)
          .orderBy(desc(tasks.created))
          .limit(100);
        
        // Extract numeric IDs from AUTO-* format and find the highest
        let maxId = 10000; // Start from 10000 for 5-digit numbers
        existingTasks.forEach(task => {
          const numericMatch = task.issueId.match(/^AUTO-(\d+)$/);
          if (numericMatch) {
            const num = parseInt(numericMatch[1], 10);
            if (num > maxId) maxId = num;
          }
        });
        
        // Generate next ID with AUTO- prefix
        finalIssueId = `AUTO-${maxId + 1}`;
      } else {
        // Check if issue ID already exists
        const [existingTask] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.issueId, finalIssueId))
          .limit(1);
        
        if (existingTask) {
          // Append timestamp to make it unique
          const timestamp = Date.now();
          finalIssueId = `${issueId}-${timestamp}`;
        }
      }

      const [task] = await db
        .insert(tasks)
        .values({
          summary,
          issueId: finalIssueId,
          issueType: issueType || "Task",
          status,
          projectName: projectName || null, // No project for individual tasks
          priority: priority || "Medium",
          resolution,
          parentTaskId: parentTaskId || null, // Set parent task ID for subtasks
          assigneeId: assigneeId || user.id, // Default to current user if not specified
          reporterId,
          creatorId: creatorId || user.id,
          description,
          projectId: projectId || null, // Allow null for individual tasks
          workspaceId: workspaceId || null, // Null for individual employee tasks
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedHours,
          actualHours: 0,
          labels: labels ? JSON.stringify(labels) : null,
          position: newPosition,
        })
        .returning();

      console.log(`✅ Task created: ID=${task.id}, IssueId=${task.issueId}, Status=${task.status}, AssigneeId=${task.assigneeId}, ProjectId=${task.projectId}, WorkspaceId=${task.workspaceId}, DueDate=${task.dueDate}`);

      // Log task creation activity
      try {
        console.log(`📝 Logging task creation: ${task.summary}`);
        await db.insert(activityLogs).values({
          actionType: ActivityAction.TASK_CREATED,
          entityType: EntityType.TASK,
          entityId: task.id,
          userId: user.id,
          userName: user.name,
          workspaceId: workspaceId || null,
          projectId: projectId || null,
          taskId: task.id,
          summary: `${user.name} created task "${task.summary}"`,
          changes: {
            metadata: {
              taskSummary: task.summary,
              taskStatus: task.status,
              taskPriority: task.priority,
              taskIssueId: task.issueId,
            },
          },
        });
        console.log(`✅ Task creation activity logged successfully`);
      } catch (error) {
        console.error('❌ Failed to log task creation activity:', error);
      }

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

      // Only check workspace membership if task has a workspaceId
      if (existingTask.workspaceId) {
        const member = await getMember({
          workspaceId: existingTask.workspaceId,
          userId: user.id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        // RBAC: Permission checks based on role
        const role = member.role as MemberRole;
        
        // MANAGEMENT cannot edit tasks
        if (role === MemberRole.MANAGEMENT) {
          return c.json({ error: "Forbidden: Management role cannot edit tasks" }, 403);
        }

        // EMPLOYEE can only edit their own tasks
        if (role === MemberRole.EMPLOYEE && existingTask.assigneeId !== user.id) {
          return c.json({ error: "Forbidden: You can only edit tasks assigned to you" }, 403);
        }

        // EMPLOYEE cannot change task status (needs approval)
        if (role === MemberRole.EMPLOYEE && updates.status && updates.status !== existingTask.status) {
          return c.json({ error: "Forbidden: Employees cannot change task status. Please request approval from your team lead or manager." }, 403);
        }

        // TEAM_LEAD can edit team tasks (TODO: Add team check when we have teams)
        // For now, TEAM_LEAD has same permissions as ADMIN/PM for editing
      }

      const [task] = await db
        .update(tasks)
        .set({
          ...updates,
          dueDate: updates.dueDate ? new Date(updates.dueDate) : existingTask.dueDate,
          updated: new Date(),
        })
        .where(eq(tasks.id, taskId))
        .returning();

      // Log activity based on what changed
      const changes: Record<string, { before: any; after: any }> = {};
      
      // Detect status change
      if (updates.status && updates.status !== existingTask.status) {
        changes.status = { before: existingTask.status, after: updates.status };
        try {
          console.log(`🔄 Logging status change: ${existingTask.status} → ${updates.status}`);
          await db.insert(activityLogs).values({
            actionType: ActivityAction.STATUS_CHANGED,
            entityType: EntityType.TASK,
            entityId: task.id,
            userId: user.id,
            userName: user.name,
            workspaceId: existingTask.workspaceId || null,
            projectId: existingTask.projectId || null,
            taskId: task.id,
            summary: `${user.name} changed status from ${existingTask.status} to ${updates.status}`,
            changes: {
              ...changes,
              metadata: {
                taskSummary: task.summary,
                oldStatus: existingTask.status,
                newStatus: updates.status,
              },
            },
          });
          console.log(`✅ Status change activity logged`);
        } catch (error) {
          console.error('❌ Failed to log status change activity:', error);
        }
      }

      // Detect assignee change
      if (updates.assigneeId !== undefined && updates.assigneeId !== existingTask.assigneeId) {
        changes.assigneeId = { before: existingTask.assigneeId, after: updates.assigneeId };
        const assigneeName = updates.assigneeId ? "a team member" : "unassigned";
        try {
          await db.insert(activityLogs).values({
            actionType: ActivityAction.ASSIGNED,
            entityType: EntityType.TASK,
            entityId: task.id,
            userId: user.id,
            userName: user.name,
            workspaceId: existingTask.workspaceId || null,
            projectId: existingTask.projectId || null,
            taskId: task.id,
            summary: updates.assigneeId 
              ? `${user.name} assigned task to ${assigneeName}`
              : `${user.name} unassigned task`,
            changes: {
              ...changes,
              metadata: {
                taskSummary: task.summary,
                assigneeId: updates.assigneeId,
              },
            },
          });
        } catch (error) {
          console.error('Failed to log assignee change activity:', error);
        }
      }

      // Detect priority change
      if (updates.priority && updates.priority !== existingTask.priority) {
        changes.priority = { before: existingTask.priority, after: updates.priority };
        try {
          await db.insert(activityLogs).values({
            actionType: ActivityAction.PRIORITY_CHANGED,
            entityType: EntityType.TASK,
            entityId: task.id,
            userId: user.id,
            userName: user.name,
            workspaceId: existingTask.workspaceId || null,
            projectId: existingTask.projectId || null,
            taskId: task.id,
            summary: `${user.name} changed priority from ${existingTask.priority} to ${updates.priority}`,
            changes: {
              ...changes,
              metadata: {
                taskSummary: task.summary,
                oldPriority: existingTask.priority,
                newPriority: updates.priority,
              },
            },
          });
        } catch (error) {
          console.error('Failed to log priority change activity:', error);
        }
      }

      // Detect due date change
      if (updates.dueDate !== undefined) {
        const oldDate = existingTask.dueDate ? new Date(existingTask.dueDate).toISOString() : null;
        const newDate = updates.dueDate ? new Date(updates.dueDate).toISOString() : null;
        if (oldDate !== newDate) {
          changes.dueDate = { before: oldDate, after: newDate };
          try {
            await db.insert(activityLogs).values({
              actionType: ActivityAction.DUE_DATE_CHANGED,
              entityType: EntityType.TASK,
              entityId: task.id,
              userId: user.id,
              userName: user.name,
              workspaceId: existingTask.workspaceId || null,
              projectId: existingTask.projectId || null,
              taskId: task.id,
              summary: newDate 
                ? `${user.name} set due date to ${new Date(newDate).toLocaleDateString()}`
                : `${user.name} removed due date`,
              changes: {
                ...changes,
                metadata: {
                  taskSummary: task.summary,
                  dueDate: newDate,
                },
              },
            });
          } catch (error) {
            console.error('Failed to log due date change activity:', error);
          }
        }
      }

      // Detect description change
      if (updates.description !== undefined && updates.description !== existingTask.description) {
        try {
          await db.insert(activityLogs).values({
            actionType: ActivityAction.DESCRIPTION_UPDATED,
            entityType: EntityType.TASK,
            entityId: task.id,
            userId: user.id,
            userName: user.name,
            workspaceId: existingTask.workspaceId || null,
            projectId: existingTask.projectId || null,
            taskId: task.id,
            summary: `${user.name} updated the description`,
            changes: {
              metadata: {
                taskSummary: task.summary,
              },
            },
          });
        } catch (error) {
          console.error('Failed to log description change activity:', error);
        }
      }

      return c.json({ data: task });
    }
  )
  .get("/:taskId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { taskId } = c.req.param();

    // Create aliases for multiple user joins
    const assigneeUser = alias(users, 'assignee_user');
    const reporterUser = alias(users, 'reporter_user');
    const creatorUser = alias(users, 'creator_user');

    const [task] = await db
      .select({
        id: tasks.id,
        summary: tasks.summary,
        issueId: tasks.issueId,
        issueType: tasks.issueType,
        status: tasks.status,
        projectName: tasks.projectName,
        priority: tasks.priority,
        resolution: tasks.resolution,
        assigneeId: tasks.assigneeId,
        reporterId: tasks.reporterId,
        creatorId: tasks.creatorId,
        created: tasks.created,
        updated: tasks.updated,
        resolved: tasks.resolved,
        dueDate: tasks.dueDate,
        labels: tasks.labels,
        description: tasks.description,
        projectId: tasks.projectId,
        workspaceId: tasks.workspaceId,
        estimatedHours: tasks.estimatedHours,
        actualHours: tasks.actualHours,
        position: tasks.position,
        assignee: {
          id: assigneeUser.id,
          name: assigneeUser.name,
          email: assigneeUser.email,
        },
        reporter: {
          id: reporterUser.id,
          name: reporterUser.name,
          email: reporterUser.email,
        },
        creator: {
          id: creatorUser.id,
          name: creatorUser.name,
          email: creatorUser.email,
        },
        project: {
          id: projects.id,
          name: projects.name,
          imageUrl: projects.imageUrl,
        },
      })
      .from(tasks)
      .leftJoin(assigneeUser, eq(tasks.assigneeId, assigneeUser.id))
      .leftJoin(reporterUser, eq(tasks.reporterId, reporterUser.id))
      .leftJoin(creatorUser, eq(tasks.creatorId, creatorUser.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    // Only check workspace membership if task has a workspaceId
    if (task.workspaceId) {
      const member = await getMember({
        workspaceId: task.workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }
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

      console.log(`\n🔄 BULK UPDATE REQUEST RECEIVED`);
      console.log(`👤 User: ${user.name} (${user.id})`);
      console.log(`📋 Tasks to update: ${tasksToUpdate.length}`);
      console.log(`📋 Task details:`, JSON.stringify(tasksToUpdate, null, 2));

      // Get all tasks and verify authorization
      const taskIds = tasksToUpdate.map((t) => t.id);
      const existingTasks = await db
        .select()
        .from(tasks)
        .where(inArray(tasks.id, taskIds));

      if (existingTasks.length !== tasksToUpdate.length) {
        return c.json({ error: "Some tasks not found" }, 404);
      }

      // Verify user has access to workspace
      const workspaceIds = Array.from(new Set(existingTasks.map((t) => t.workspaceId).filter(Boolean))) as string[];
      
      for (const workspaceId of workspaceIds) {
        const member = await getMember({
          workspaceId,
          userId: user.id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }
      }

      // Update all tasks using batch transaction for better performance
      const updatedTasks = await db.transaction(async (tx) => {
        const results = [];
        
        // Process updates in smaller batches to avoid overwhelming database
        const batchSize = 10;
        for (let i = 0; i < tasksToUpdate.length; i += batchSize) {
          const batch = tasksToUpdate.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (taskUpdate) => {
            const [updated] = await tx
              .update(tasks)
              .set({
                status: taskUpdate.status,
                position: taskUpdate.position,
                updated: new Date(),
              })
              .where(eq(tasks.id, taskUpdate.id))
              .returning();
            return updated;
          });
          
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);
        }
        
        return results;
      });

      // Log column move activity for tasks that changed status
      for (const taskUpdate of tasksToUpdate) {
        const existingTask = existingTasks.find(t => t.id === taskUpdate.id);
        const updatedTask = updatedTasks.find(t => t.id === taskUpdate.id);
        
        if (existingTask && updatedTask && existingTask.status !== taskUpdate.status) {
          try {
            console.log(`📋 Logging column move: ${existingTask.status} → ${taskUpdate.status} for task: ${updatedTask.summary}`);
            await db.insert(activityLogs).values({
              actionType: ActivityAction.COLUMN_MOVED,
              entityType: EntityType.TASK,
              entityId: updatedTask.id,
              userId: user.id,
              userName: user.name,
              workspaceId: existingTask.workspaceId || null,
              projectId: existingTask.projectId || null,
              taskId: updatedTask.id,
              summary: `${user.name} moved task from ${existingTask.status} to ${taskUpdate.status}`,
              changes: {
                field: 'status',
                oldValue: existingTask.status,
                newValue: taskUpdate.status,
                metadata: {
                  taskSummary: updatedTask.summary,
                  oldStatus: existingTask.status,
                  newStatus: taskUpdate.status,
                  oldPosition: existingTask.position,
                  newPosition: taskUpdate.position,
                },
              },
            });
            console.log(`✅ Column move activity logged successfully`);
          } catch (error) {
            console.error('❌ Failed to log column move activity:', error);
          }

          // Send notification to admins when task is moved to IN_REVIEW
          // BUT NOT for individual tasks (projectId is null) - those are private to employees
          if (taskUpdate.status === TaskStatus.IN_REVIEW && existingTask.status !== TaskStatus.IN_REVIEW && existingTask.projectId !== null) {
            try {
              console.log(`📧 Sending IN_REVIEW notification to ALL admins for task: ${updatedTask.summary}`);
              console.log(`📧 Task status changed from ${existingTask.status} to ${taskUpdate.status}`);
              
              // Get ALL admin users across all workspaces
              const adminMembers = await db
                .select({
                  userId: members.userId,
                  userName: users.name,
                })
                .from(members)
                .innerJoin(users, eq(members.userId, users.id))
                .where(eq(members.role, MemberRole.ADMIN));

              console.log(`📧 Found ${adminMembers.length} admin(s) in system:`, adminMembers);

              // Send notification to each admin
              for (const admin of adminMembers) {
                console.log(`📧 Creating notification for admin: ${admin.userName} (${admin.userId})`);
                const newNotification = await db.insert(notifications).values({
                  userId: admin.userId,
                  taskId: updatedTask.id,
                  type: "TASK_IN_REVIEW",
                  title: "Task Ready for Review",
                  message: `${user.name} has moved task "${updatedTask.summary}" (${updatedTask.issueId}) to In Review and is awaiting your approval.`,
                  actionBy: user.id,
                  actionByName: user.name,
                  isRead: "false",
                  createdAt: new Date(), // Explicitly set current UTC timestamp
                }).returning();
                console.log(`✅ Notification created:`, newNotification);
              }
              
              console.log(`✅ Notified ${adminMembers.length} admin(s) about task in review`);
            } catch (error) {
              console.error('❌ Failed to send IN_REVIEW notification to admins:', error);
              console.error('❌ Error details:', error);
            }
          }
        }
      }

      return c.json({ data: updatedTasks });
    }
  )
  .post(
    "/upload-excel",
    sessionMiddleware,
    async (c) => {
      try {
        console.log('📤 CSV Upload request received');
        const user = c.get("user");
        console.log('👤 User:', user.email);
        
        // Check if user is admin
        const adminMember = await db.query.members.findFirst({
          where: and(
            eq(members.userId, user.id),
            or(
              eq(members.role, MemberRole.ADMIN),
              eq(members.role, MemberRole.PROJECT_MANAGER),
              eq(members.role, MemberRole.MANAGEMENT)
            )
          ),
        });

        if (!adminMember) {
          console.error('❌ Unauthorized - Admin access required');
          return c.json({ error: "Unauthorized - Admin access required for bulk uploads" }, 403);
        }

        const formData = await c.req.formData();
        
        const file = formData.get('file') as File;
        const workspaceId = formData.get('workspaceId') as string | null;
        const projectId = formData.get('projectId') as string;

        console.log('📁 File:', file?.name, 'Size:', file?.size);
        console.log('🏢 Workspace:', workspaceId || 'N/A (project-centric)');
        console.log('📊 Project:', projectId);

        if (!file) {
          console.error('❌ No file uploaded');
          return c.json({ error: "No file uploaded" }, 400);
        }

        // Check file size limit (100MB)
        const maxSizeInBytes = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSizeInBytes) {
          return c.json({ 
            error: `File size too large. Maximum allowed size is 100MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.` 
          }, 400);
        }

        if (!projectId) {
          return c.json({ error: "Project ID is required" }, 400);
        }

        // Project-centric: Any authenticated user can upload tasks
        console.log('✅ User authenticated');

        // Get project to verify it exists
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1);

        if (!project) {
          console.error('❌ Project not found');
          return c.json({ error: "Project not found" }, 404);
        }

        console.log('✅ Project found:', project.name);
        
        // Get the workspace ID from the project for column creation (if available)
        // For projects without workspace, we'll skip automatic column creation
        const projectWorkspaceId = project.workspaceId;
        
        if (projectWorkspaceId) {
          console.log('📊 Project workspace ID:', projectWorkspaceId);
        } else {
          console.log('⚠️ Project has no workspace - will skip automatic column creation');
        }

        // Generate a unique batch ID for this upload
        // Choose one of the following formats:
        
        // Option 1: Human-readable with project name, date, time, and random suffix
        // Example: BENZ_20251111_143052_A7B
        const uploadBatchId = generateReadableBatchId(project.name);
        
        // Option 2: Sequential batch number (uncomment to use)
        // Example: BATCH_001234
        // const uploadBatchId = await generateSequentialBatchId(projectId);
        
        // Option 3: Custom format with project code, user initials, and timestamp
        // Example: BNZ-AU-20251111143052
        // const uploadBatchId = generateCustomBatchId(project.name, user.name);
        
        // Option 4: Original UUID format (uncomment to use)
        // Example: 550e8400-e29b-41d4-a716-446655440000
        // const uploadBatchId = crypto.randomUUID();
        
        const uploadedAt = new Date();
        console.log('🔖 Upload Batch ID:', uploadBatchId);
        const fileName = file.name.toLowerCase();
        let rowsData: string[][] = [];
        
        if (fileName.endsWith('.csv')) {
          // Handle CSV files - improved parsing for large files
          console.log(`Processing CSV file: ${file.name}, Size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
          
          const fileContent = await file.text();
          const lines = fileContent.split('\n').filter(line => line.trim());
          
          console.log(`Found ${lines.length} lines in CSV file`);
          
          // Improved CSV parsing that handles commas within quotes
          rowsData = lines.map(line => {
            const result = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            
            return result.map(cell => cell.replace(/^"|"$/g, '').trim());
          });
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          // For Excel files, return error for now since we need proper Excel parsing library
          return c.json({ 
            error: "Excel files not supported yet. Please upload as CSV format instead." 
          }, 400);
        } else {
          return c.json({ 
            error: "Unsupported file format. Please upload CSV files only." 
          }, 400);
        }
        
        if (rowsData.length < 2) {
          return c.json({ error: "File must contain at least a header and one data row" }, 400);
        }
        
        const headers = rowsData[0];
        const createdTasks = [];
        
        // Create dynamic column mapping based on header row
        const columnMap: { [key: string]: number } = {};
        headers.forEach((header, index) => {
          const normalizedHeader = header.trim().toLowerCase();
          columnMap[normalizedHeader] = index;
        });
        
        console.log('📋 Column mapping detected:', columnMap);
        
        // Auto-create missing columns for the project
        console.log('🔍 Checking for missing columns in project...');
        
        // Get existing columns for this project
        const existingColumns = await db
          .select()
          .from(listViewColumns)
          .where(eq(listViewColumns.projectId, project.id));
        
        const existingFieldNames = new Set(
          existingColumns.map(col => col.fieldName.toLowerCase())
        );
        
        console.log('📊 Existing columns:', Array.from(existingFieldNames));
        
        // If no columns exist for this project, create default system columns first
        if (existingColumns.length === 0) {
          console.log('🆕 No columns found - creating default system columns for project');
          
          const defaultColumns = [
            { fieldName: 'issueId', displayName: 'Issue ID', columnType: 'text', width: 180, position: 0, isSystem: true },
            { fieldName: 'summary', displayName: 'Summary', columnType: 'text', width: 300, position: 1, isSystem: true },
            { fieldName: 'status', displayName: 'Status', columnType: 'select', width: 140, position: 2, isSystem: true },
            { fieldName: 'priority', displayName: 'Priority', columnType: 'priority', width: 120, position: 3, isSystem: true },
            { fieldName: 'assigneeId', displayName: 'Assignee', columnType: 'user', width: 180, position: 4, isSystem: true },
          ];
          
          for (const col of defaultColumns) {
            try {
              await db.insert(listViewColumns).values({
                projectId: project.id,
                fieldName: col.fieldName,
                displayName: col.displayName,
                columnType: col.columnType as any,
                width: col.width,
                position: col.position,
                isVisible: true,
                isSortable: true,
                isFilterable: true,
                isSystem: col.isSystem,
              });
              existingFieldNames.add(col.fieldName.toLowerCase());
              console.log(`✅ Created default column: ${col.displayName}`);
            } catch (error) {
              console.error(`❌ Failed to create default column ${col.displayName}:`, error);
            }
          }
        }
        
        // Define standard fields that don't need column creation
        const standardFields = [
            'summary', 'task', 'title', 'description',
            'summary id', 'summaryid', 'task id',
            'issue id', 'issueid', 'key', 'id',
            'issue type', 'issuetype', 'type',
            'status', 'state',
            'project name', 'projectname', 'project',
            'priority',
            'resolution',
            'assignee', 'assigned to', 'owner',
            'reporter', 'reported by',
            'creator', 'created by', 'author',
            'created', 'create date', 'created date',
            'updated', 'update date', 'updated date', 'last updated',
            'resolved', 'resolve date', 'resolved date', 'resolution date',
            'due date', 'duedate', 'due',
            'labels', 'tags', 'label',
            'details', 'notes',
            'project_id', 'projectid',
            'workspace_id', 'workspaceid',
            'estimated hours', 'estimatedhours', 'estimate', 'estimated time',
            'actual hours', 'actualhours', 'actual time', 'time spent',
            'position', 'order', 'rank'
          ];
        
        // Find missing columns that need to be created
        const missingColumns: Array<{ header: string; fieldName: string; columnType: string; width: number }> = [];
        
        headers.forEach(header => {
          const normalizedHeader = header.trim().toLowerCase();
          const fieldName = header.trim().toLowerCase().replace(/\s+/g, '_');
          
          // Skip if it's a standard field or already exists
          if (standardFields.includes(normalizedHeader) || existingFieldNames.has(fieldName)) {
            return;
          }
          
          // Auto-detect column type based on field name
          let columnType: 'text' | 'user' | 'date' | 'select' | 'priority' | 'labels' = 'text';
          let width = 150;
          
          if (normalizedHeader.includes('date')) {
            columnType = 'date';
            width = 140;
          } else if (normalizedHeader.includes('label') || normalizedHeader.includes('tag')) {
            columnType = 'labels';
            width = 200;
          } else if (normalizedHeader === 'priority') {
            columnType = 'priority';
            width = 120;
          } else if (normalizedHeader === 'status' || normalizedHeader === 'type' || normalizedHeader === 'resolution') {
            columnType = 'select';
            width = 140;
          }
          
          missingColumns.push({
            header: header.trim(),
            fieldName,
            columnType,
            width
          });
        });
        
        // Create missing columns
        if (missingColumns.length > 0) {
          console.log(`📝 Creating ${missingColumns.length} missing columns:`, missingColumns.map(c => c.header));
          
          // Get max position for ordering
          const maxPosition = existingColumns.length > 0 
            ? Math.max(...existingColumns.map(col => col.position || 0))
            : 0;
          
          for (let i = 0; i < missingColumns.length; i++) {
            const col = missingColumns[i];
            try {
              await db.insert(listViewColumns).values({
                projectId: project.id,
                fieldName: col.fieldName,
                displayName: col.header,
                columnType: col.columnType,
                width: col.width,
                position: maxPosition + i + 1,
                isVisible: true,
                isSortable: true,
                isFilterable: true,
                isSystem: false,
              });
              console.log(`✅ Created column: ${col.header} (${col.columnType})`);
            } catch (error) {
              console.error(`❌ Failed to create column ${col.header}:`, error);
            }
          }
        } else {
          console.log('✅ No missing columns - all CSV columns already exist in project');
        }
        
        // Helper function to get value from row using header name (case-insensitive, flexible matching)
        const getCellValue = (row: string[], headerNames: string[]): string => {
          for (const headerName of headerNames) {
            const index = columnMap[headerName.toLowerCase()];
            if (index !== undefined && row[index] !== undefined) {
              return row[index]?.trim() || '';
            }
          }
          return '';
        };
        
        // Filter out empty rows and instruction rows (rows that start with parenthesis or are all empty)
        const dataRows = rowsData.slice(1).filter(row => {
          // Skip if row is empty
          if (!row || row.every(cell => !cell || !cell.trim())) {
            console.log('⏭️ Skipping empty row');
            return false;
          }
          // Skip if first cell contains instruction text
          if (row[0] && (row[0].includes('titles should not be modified') || row[0].startsWith('('))) {
            console.log('⏭️ Skipping instruction row:', row[0]);
            return false;
          }
          console.log('✓ Valid data row found:', row[0]);
          return true;
        });
        
        console.log(`📊 Processing ${dataRows.length} data rows (filtered from ${rowsData.length - 1} total rows)`);
        
        if (dataRows.length === 0) {
          console.error('❌ No valid data rows found');
          return c.json({ error: "No valid data rows found in the file" }, 400);
        }
        
        // Find all user IDs by name or email (assignee, reporter, creator) - use dynamic column mapping
        const userNamesSet = new Set();
        dataRows.forEach(row => {
          const assigneeValue = getCellValue(row, ['assignee', 'assigned to', 'owner']);
          const reporterValue = getCellValue(row, ['reporter', 'reported by']);
          const creatorValue = getCellValue(row, ['creator', 'created by', 'author']);
          
          if (assigneeValue) userNamesSet.add(assigneeValue);
          if (reporterValue) userNamesSet.add(reporterValue);
          if (creatorValue) userNamesSet.add(creatorValue);
        });
        const userNames = Array.from(userNamesSet).filter(Boolean) as string[];
        const assigneeMap = new Map();
        
        console.log('👥 Looking up users:', userNames);
        
        if (userNames.length > 0) {
          const assignees = await db
            .select()
            .from(users)
            .where(
              or(
                inArray(users.name, userNames),
                inArray(users.email, userNames)
              )!
            );
          
          console.log(`✅ Found ${assignees.length} matching users in database`);
          
          assignees.forEach(assignee => {
            assigneeMap.set(assignee.name, assignee.id);
            assigneeMap.set(assignee.email, assignee.id);
            console.log(`   - ${assignee.name} (${assignee.email}) → ${assignee.id}`);
          });
        }

        // Parse date helper function
        const parseDate = (dateStr: string): Date => {
          if (!dateStr || dateStr.trim() === '') {
            return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days from now
          }
          
          const cleanStr = dateStr.trim();
          
          // Handle DD-MMM-YY format (e.g., "03-Oct-25")
          const matches = cleanStr.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
          if (matches) {
            const [, day, monthStr, year] = matches;
            const monthMap: { [key: string]: number } = {
              'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
              'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };
            const fullYear = parseInt(year) + 2000;
            const month = monthMap[monthStr] ?? 0;
            const parsedDate = new Date(fullYear, month, parseInt(day));
            
            // Validate the date
            if (isNaN(parsedDate.getTime())) {
              return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            }
            return parsedDate;
          }
          
          // Try standard Date parsing
          const standardDate = new Date(cleanStr);
          if (!isNaN(standardDate.getTime())) {
            return standardDate;
          }
          
          // If all fails, return default date
          return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        };

        // Process rows in batches for better performance (100x faster than row-by-row)
        const BATCH_SIZE = 100;
        const taskDataBatch = [];
        
        // Get the highest existing AUTO-* issue ID to start from
        const existingTasks = await db
          .select({ issueId: tasks.issueId })
          .from(tasks)
          .orderBy(desc(tasks.created))
          .limit(100);
        
        let maxId = 10000; // Start from 10000 for 5-digit numbers
        existingTasks.forEach(task => {
          const numericMatch = task.issueId.match(/^AUTO-(\d+)$/);
          if (numericMatch) {
            const num = parseInt(numericMatch[1], 10);
            if (num > maxId) maxId = num;
          }
        });
        
        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          
          console.log(`\n📝 Processing row ${i + 1}/${dataRows.length}:`, row.slice(0, 5));
          
          // Use dynamic column mapping to extract values
          const summary = getCellValue(row, ['summary', 'task', 'title', 'description']);
          
          if (!summary) {
            console.log('⏭️ Skipping row - no summary/task/title found');
            continue; // Skip empty rows - Summary must have content
          }
          
          // Map CSV columns to fields using flexible header matching
          const summaryId = getCellValue(row, ['summary id', 'summaryid', 'task id']);
          const issueId = getCellValue(row, ['issue id', 'issueid', 'key', 'id']) || `AUTO-${++maxId}`;
          const issueTypeRaw = getCellValue(row, ['issue type', 'issuetype', 'type']) || 'Task';
          const status = getCellValue(row, ['status', 'state']) || TaskStatus.TODO;
          
          // Map numeric issue type IDs to text (common in Jira exports)
          let issueType = issueTypeRaw;
          const issueTypeMap: { [key: string]: string } = {
            '1': 'Bug',
            '2': 'Feature',
            '3': 'Task',
            '4': 'Epic',
            '5': 'Story',
            '6': 'Subtask',
            '7': 'Improvement',
            '10000': 'Epic',
            '10001': 'Story',
            '10002': 'Task',
            '10003': 'Subtask',
            '10004': 'Bug',
          };
          
          // Check if issueType is numeric and map it
          if (issueTypeRaw && /^\d+$/.test(issueTypeRaw)) {
            issueType = issueTypeMap[issueTypeRaw] || 'Task';
            console.log(`🔄 Mapped numeric issue type ${issueTypeRaw} to ${issueType}`);
          } else if (issueTypeRaw) {
            // Ensure the issueType is a valid string
            issueType = issueTypeRaw;
          }
          
          const projectName = getCellValue(row, ['project name', 'projectname', 'project']) || project.name;
          const priority = getCellValue(row, ['priority']) || TaskPriority.MEDIUM;
          const resolution = getCellValue(row, ['resolution']) || null;
          const assigneeValue = getCellValue(row, ['assignee', 'assigned to', 'owner']);
          const reporterValue = getCellValue(row, ['reporter', 'reported by']);
          const creatorValue = getCellValue(row, ['creator', 'created by', 'author']);
          const createdValue = getCellValue(row, ['created', 'create date', 'created date']);
          const updatedValue = getCellValue(row, ['updated', 'update date', 'updated date', 'last updated']);
          const resolvedValue = getCellValue(row, ['resolved', 'resolve date', 'resolved date', 'resolution date']);
          const dueDate = getCellValue(row, ['due date', 'duedate', 'due']);
          const labels = getCellValue(row, ['labels', 'tags', 'label']);
          const description = getCellValue(row, ['description', 'details', 'notes']);
          const csvProjectId = getCellValue(row, ['project_id', 'projectid']);
          const csvWorkspaceId = getCellValue(row, ['workspace_id', 'workspaceid']);
          const estimatedHours = getCellValue(row, ['estimated hours', 'estimatedhours', 'estimate', 'estimated time']);
          const actualHours = getCellValue(row, ['actual hours', 'actualhours', 'actual time', 'time spent']);
          const positionValue = getCellValue(row, ['position', 'order', 'rank']);
          
          // Extract custom fields (any column not in standard fields)
          const standardFields = [
            'summary', 'task', 'title', 'description',
            'summary id', 'summaryid', 'task id',
            'issue id', 'issueid', 'key', 'id',
            'issue type', 'issuetype', 'type',
            'status', 'state',
            'project name', 'projectname', 'project',
            'priority',
            'resolution',
            'assignee', 'assigned to', 'owner',
            'reporter', 'reported by',
            'creator', 'created by', 'author',
            'created', 'create date', 'created date',
            'updated', 'update date', 'updated date', 'last updated',
            'resolved', 'resolve date', 'resolved date', 'resolution date',
            'due date', 'duedate', 'due',
            'labels', 'tags', 'label',
            'details', 'notes',
            'project_id', 'projectid',
            'workspace_id', 'workspaceid',
            'estimated hours', 'estimatedhours', 'estimate', 'estimated time',
            'actual hours', 'actualhours', 'actual time', 'time spent',
            'position', 'order', 'rank'
          ];
          
          const customFields: { [key: string]: any } = {};
          headers.forEach((header, index) => {
            const normalizedHeader = header.trim().toLowerCase();
            // Check if this is NOT a standard field
            if (!standardFields.includes(normalizedHeader) && row[index]?.trim()) {
              // Store custom field with original header name as key
              customFields[header.trim()] = row[index].trim();
            }
          });
          
          console.log(`📦 Custom fields detected:`, Object.keys(customFields).length > 0 ? customFields : 'None');
          
          // Map status to enum
          let taskStatus = TaskStatus.TODO;
          const statusMap: { [key: string]: TaskStatus } = {
            'to do': TaskStatus.TODO,
            'todo': TaskStatus.TODO,
            'backlog': TaskStatus.BACKLOG,
            'in progress': TaskStatus.IN_PROGRESS,
            'in_progress': TaskStatus.IN_PROGRESS,
            'in review': TaskStatus.IN_REVIEW,
            'in_review': TaskStatus.IN_REVIEW,
            'done': TaskStatus.DONE,
            'completed': TaskStatus.DONE,
          };
          if (status && statusMap[status.toLowerCase()]) {
            taskStatus = statusMap[status.toLowerCase()];
          }
          
          // Map priority to enum
          let taskPriority = TaskPriority.MEDIUM;
          const priorityMap: { [key: string]: TaskPriority } = {
            'low': TaskPriority.LOW,
            'medium': TaskPriority.MEDIUM,
            'high': TaskPriority.HIGH,
            'critical': TaskPriority.CRITICAL,
          };
          if (priority && priorityMap[priority.toLowerCase()]) {
            taskPriority = priorityMap[priority.toLowerCase()];
          }
          
          // Find assignee ID
          let assigneeId = assigneeMap.get(assigneeValue) || null;
          if (!assigneeId && assigneeValue) {
            console.log(`⚠️  Assignee not found: "${assigneeValue}" - will use current user`);
            assigneeId = user.id;
          } else if (!assigneeValue) {
            assigneeId = user.id;
          } else {
            console.log(`✓ Assignee mapped: "${assigneeValue}" → ${assigneeId}`);
          }
          
          // Find reporter ID (or use current user)
          let reporterId = assigneeMap.get(reporterValue) || null;
          if (!reporterId && reporterValue) {
            console.log(`⚠️  Reporter not found: "${reporterValue}" - will use current user`);
            reporterId = user.id;
          } else if (!reporterValue) {
            reporterId = user.id;
          } else {
            console.log(`✓ Reporter mapped: "${reporterValue}" → ${reporterId}`);
          }
          
          // Find creator ID (or use current user)
          let creatorId = assigneeMap.get(creatorValue) || null;
          if (!creatorId && creatorValue) {
            console.log(`⚠️  Creator not found: "${creatorValue}" - will use current user`);
            creatorId = user.id;
          } else if (!creatorValue) {
            creatorId = user.id;
          } else {
            console.log(`✓ Creator mapped: "${creatorValue}" → ${creatorId}`);
          }
          
          // Parse dates
          let parsedDueDate = null;
          if (dueDate) {
            parsedDueDate = parseDate(dueDate);
          }
          
          let parsedCreated = null;
          if (createdValue) {
            parsedCreated = parseDate(createdValue);
          }
          
          let parsedResolved = null;
          if (resolvedValue) {
            parsedResolved = parseDate(resolvedValue);
          }
          
          // Parse numbers
          const parsedEstimatedHours = estimatedHours ? parseInt(estimatedHours, 10) : null;
          const parsedActualHours = actualHours ? parseInt(actualHours, 10) : 0;
          const parsedPosition = positionValue ? parseInt(positionValue, 10) : (1000 + i);
          
          // Parse labels (comma-separated or JSON)
          let parsedLabels = null;
          if (labels) {
            try {
              // Try to parse as JSON first
              parsedLabels = JSON.parse(labels);
              if (!Array.isArray(parsedLabels)) {
                parsedLabels = JSON.stringify([labels]);
              } else {
                parsedLabels = JSON.stringify(parsedLabels);
              }
            } catch {
              // If not JSON, split by comma
              const labelArray = labels.split(',').map(l => l.trim()).filter(Boolean);
              parsedLabels = labelArray.length > 0 ? JSON.stringify(labelArray) : null;
            }
          }
          
          const taskData = {
            summary: summary || `Task ${i}`,
            issueId: issueId,
            issueType: issueType,
            status: taskStatus,
            projectName: projectName,
            priority: taskPriority,
            resolution: resolution || null,
            assigneeId,
            reporterId,
            creatorId,
            created: parsedCreated || new Date(),
            updated: new Date(),
            resolved: parsedResolved || null,
            description: description || '',
            projectId: csvProjectId || projectId, // Use CSV project ID if provided, else use selected
            workspaceId: null, // No workspace concept
            dueDate: parsedDueDate,
            estimatedHours: parsedEstimatedHours,
            actualHours: parsedActualHours,
            labels: parsedLabels,
            customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null,
            position: parsedPosition,
            // Upload tracking
            uploadBatchId: uploadBatchId,
            uploadedAt: uploadedAt,
            uploadedBy: user.id,
          };

          taskDataBatch.push(taskData);
          
          // Insert batch when it reaches BATCH_SIZE or at the end
          if (taskDataBatch.length >= BATCH_SIZE || i === dataRows.length - 1) {
            try {
              const insertedTasks = await db
                .insert(tasks)
                .values(taskDataBatch)
                .returning();
              
              createdTasks.push(...insertedTasks);
              console.log(`✅ Inserted batch of ${taskDataBatch.length} tasks (total: ${createdTasks.length})`);
              taskDataBatch.length = 0; // Clear batch
            } catch (error) {
              console.error(`❌ Error inserting batch at row ${i}:`, error);
              // Try inserting failed batch one-by-one as fallback
              for (const failedTask of taskDataBatch) {
                try {
                  const [newTask] = await db.insert(tasks).values(failedTask).returning();
                  createdTasks.push(newTask);
                } catch (singleError: any) {
                  // Check if it's a duplicate key error
                  if (singleError?.cause?.code === '23505' && singleError?.cause?.constraint_name === 'tasks_issue_id_unique') {
                    console.log(`⚠️  Skipping duplicate task with issue_id: ${failedTask.issueId}`);
                  } else {
                    console.error(`❌ Failed to insert task: ${failedTask.summary}`, singleError);
                  }
                }
              }
              taskDataBatch.length = 0; // Clear batch
            }
          }
        }

        // Don't log after this point to avoid response corruption
        const totalCreated = createdTasks.length;
        const batchId = uploadBatchId;
        const totalRows = dataRows.filter(row => {
          const summary = getCellValue(row, ['summary', 'task', 'title', 'description']);
          return summary?.trim();
        }).length;
        const skipped = totalRows - totalCreated;

        // Return appropriate message based on results
        let message: string;
        if (totalCreated === 0 && skipped > 0) {
          message = `All ${skipped} tasks already exist (duplicate Issue IDs). Please update existing tasks or change Issue IDs in the CSV.`;
        } else if (totalCreated > 0 && skipped > 0) {
          message = `Imported ${totalCreated} tasks. Skipped ${skipped} duplicate tasks.`;
        } else {
          message = `Successfully imported ${totalCreated} tasks`;
        }

        return c.json({ 
          data: { 
            message,
            uploadBatchId: batchId,
            count: totalCreated,
            skipped
          } 
        }, totalCreated === 0 && skipped > 0 ? 409 : 200); // 409 Conflict for all duplicates
        
      } catch (error) {
        console.error('❌ Excel upload error:', error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
        return c.json({ 
          error: error instanceof Error ? error.message : "Failed to process CSV file" 
        }, 500);
      }
    }
  )
  .delete(
    "/batch/:batchId",
    sessionMiddleware,
    async (c) => {
      try {
        const user = c.get("user");
        const { batchId } = c.req.param();

        console.log('🗑️ Batch delete request for batch:', batchId);

        // Get tasks from this batch to check permissions
        const batchTasks = await db
          .select()
          .from(tasks)
          .where(eq(tasks.uploadBatchId, batchId))
          .limit(1);

        if (batchTasks.length === 0) {
          return c.json({ error: "Batch not found or already deleted" }, 404);
        }

        const workspaceId = batchTasks[0].workspaceId;

        // Verify user is member of workspace
        const member = await getMember({
          workspaceId: workspaceId!,
          userId: user.id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        // RBAC: Only ADMIN and PROJECT_MANAGER can delete batches
        const allowedRoles = [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER];
        if (!allowedRoles.includes(member.role as MemberRole)) {
          return c.json({ 
            error: "Forbidden: Only admins and project managers can delete upload batches" 
          }, 403);
        }

        // Delete all tasks from this batch
        const deletedTasks = await db
          .delete(tasks)
          .where(eq(tasks.uploadBatchId, batchId))
          .returning();

        console.log(`✅ Deleted ${deletedTasks.length} tasks from batch ${batchId}`);

        return c.json({ 
          data: { 
            message: `Successfully deleted ${deletedTasks.length} tasks`,
            deletedCount: deletedTasks.length,
            batchId: batchId
          } 
        });

      } catch (error) {
        console.error('❌ Batch delete error:', error);
        return c.json({ 
          error: error instanceof Error ? error.message : "Failed to delete batch" 
        }, 500);
      }
    }
  );

export default app;
