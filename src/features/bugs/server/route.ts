import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { bugs, customBugTypes, users, notifications, bugComments, members } from "@/db/schema";
import { createBugSchema, updateBugSchema, createBugTypeSchema } from "../schemas";
import { sessionMiddleware } from "@/lib/session-middleware";
import { MemberRole } from "@/features/members/types";

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
  // Get ALL bugs (Admin only - for monitoring)
  .get("/admin/all", sessionMiddleware, async (c) => {
    const user = c.get("user");

    // Check if user is admin
    const adminCheck = await isUserAdmin(user.id);
    if (!adminCheck) {
      return c.json({ error: "Unauthorized - Admin access required" }, 403);
    }

    // Get ALL bugs with full details
    const bugsList = await db
      .select({
        bug: bugs,
        assignedToUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        reportedByUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(bugs)
      .leftJoin(users, eq(bugs.assignedTo, users.id))
      .orderBy(desc(bugs.createdAt));

    // Get comment counts for each bug
    const bugsWithComments = await Promise.all(
      bugsList.map(async ({ bug, assignedToUser }) => {
        const commentCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(bugComments)
          .where(eq(bugComments.bugId, bug.id));

        return {
          ...bug,
          assignedToName: assignedToUser?.name || null,
          assignedToEmail: assignedToUser?.email || null,
          commentCount: Number(commentCount[0].count),
        };
      })
    );

    return c.json({ data: bugsWithComments });
  })
  // Get all bugs for current user (assigned or reported)
  .get("/", sessionMiddleware, async (c) => {
    const user = c.get("user");

    const bugsList = await db
      .select({
        bug: bugs,
        assignedToUser: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(bugs)
      .leftJoin(users, eq(bugs.assignedTo, users.id))
      .where(
        sql`${bugs.assignedTo} = ${user.id} OR ${bugs.reportedBy} = ${user.id}`
      )
      .orderBy(desc(bugs.createdAt));

    const formattedBugs = bugsList.map(({ bug, assignedToUser }) => ({
      ...bug,
      assignedToName: assignedToUser?.name || null,
    }));

    return c.json({ data: formattedBugs });
  })
  // Get bugs assigned to current user
  .get("/assigned", sessionMiddleware, async (c) => {
    const user = c.get("user");

    const bugsList = await db
      .select({
        bug: bugs,
        reportedByUser: {
          id: users.id,
          name: users.name,
        },
      })
      .from(bugs)
      .leftJoin(users, eq(bugs.reportedBy, users.id))
      .where(eq(bugs.assignedTo, user.id))
      .orderBy(desc(bugs.createdAt));

    const formattedBugs = bugsList.map(({ bug, reportedByUser }) => ({
      ...bug,
      reporterName: reportedByUser?.name || bug.reportedByName,
    }));

    return c.json({ data: formattedBugs });
  })
  // Get bugs reported by current user
  .get("/reported", sessionMiddleware, async (c) => {
    const user = c.get("user");

    const bugsList = await db
      .select({
        bug: bugs,
        assignedToUser: {
          id: users.id,
          name: users.name,
        },
      })
      .from(bugs)
      .leftJoin(users, eq(bugs.assignedTo, users.id))
      .where(eq(bugs.reportedBy, user.id))
      .orderBy(desc(bugs.createdAt));

    const formattedBugs = bugsList.map(({ bug, assignedToUser }) => ({
      ...bug,
      assignedToName: assignedToUser?.name || null,
    }));

    return c.json({ data: formattedBugs });
  })
  // Create a new bug
  .post("/", sessionMiddleware, zValidator("json", createBugSchema), async (c) => {
    const user = c.get("user");
    const { assignedTo, bugType, bugDescription, fileUrl, priority, workspaceId } = c.req.valid("json");

    // Generate bug ID
    const lastBug = await db
      .select({ bugId: bugs.bugId })
      .from(bugs)
      .orderBy(desc(bugs.createdAt))
      .limit(1);

    let nextBugNumber = 1;
    if (lastBug.length > 0 && lastBug[0].bugId) {
      const lastNumber = parseInt(lastBug[0].bugId.split("-")[1]);
      nextBugNumber = lastNumber + 1;
    }

    const bugId = `BUG-${String(nextBugNumber).padStart(3, "0")}`;

    // Create bug
    const [newBug] = await db
      .insert(bugs)
      .values({
        bugId,
        assignedTo,
        bugType,
        bugDescription,
        fileUrl: fileUrl || null,
        priority: priority || "Medium",
        reportedBy: user.id,
        reportedByName: user.name,
        workspaceId: workspaceId || null,
        status: "Open",
      })
      .returning();

    // Create notification for assigned user
    await db.insert(notifications).values({
      userId: assignedTo,
      taskId: null,
      type: "BUG_ASSIGNED",
      title: `New Bug Assigned: ${bugId}`,
      message: `${user.name} has assigned you a ${bugType} bug.\n\nDescription: ${bugDescription}`,
      actionBy: user.id,
      actionByName: user.name,
      isRead: "false",
    });

    return c.json({ data: newBug });
  })
  // Update bug status/priority
  .patch("/:bugId", sessionMiddleware, zValidator("json", updateBugSchema), async (c) => {
    const user = c.get("user");
    const { bugId } = c.req.param();
    const updates = c.req.valid("json");

    const [existingBug] = await db
      .select()
      .from(bugs)
      .where(eq(bugs.bugId, bugId))
      .limit(1);

    if (!existingBug) {
      return c.json({ error: "Bug not found" }, 404);
    }

    // Check if user is assigned to this bug or reported it
    if (existingBug.assignedTo !== user.id && existingBug.reportedBy !== user.id) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.status) {
      updateData.status = updates.status;
      
      // Set resolvedAt only when changing TO Resolved/Closed status
      if ((updates.status === "Resolved" || updates.status === "Closed") && 
          (existingBug.status !== "Resolved" && existingBug.status !== "Closed")) {
        updateData.resolvedAt = new Date();
      }
      
      // Clear resolvedAt if changing back to Open or In Progress
      if ((updates.status === "Open" || updates.status === "In Progress") && existingBug.resolvedAt) {
        updateData.resolvedAt = null;
      }
    }

    if (updates.priority) {
      updateData.priority = updates.priority;
    }

    if (updates.assignedTo) {
      updateData.assignedTo = updates.assignedTo;
    }

    if (updates.fileUrl !== undefined) {
      // Only allow reporter to update file
      if (existingBug.reportedBy === user.id) {
        // Empty string means remove file
        updateData.fileUrl = updates.fileUrl === '' ? null : updates.fileUrl;
      }
    }

    if (updates.outputFileUrl !== undefined) {
      // Only allow assignee to update output file
      if (existingBug.assignedTo === user.id) {
        updateData.outputFileUrl = updates.outputFileUrl === '' ? null : updates.outputFileUrl;
      }
    }

    const [updatedBug] = await db
      .update(bugs)
      .set(updateData)
      .where(eq(bugs.bugId, bugId))
      .returning();

    // Notify reporter if status changed
    if (updates.status && existingBug.reportedBy !== user.id) {
      await db.insert(notifications).values({
        userId: existingBug.reportedBy,
        taskId: null,
        type: "BUG_STATUS_UPDATED",
        title: `Bug ${bugId} Status Updated`,
        message: `${user.name} changed the status to: ${updates.status}`,
        actionBy: user.id,
        actionByName: user.name,
        isRead: "false",
      });
    }

    return c.json({ data: updatedBug });
  })
  // Get all bug types
  .get("/types", sessionMiddleware, async (c) => {
    const bugTypes = await db
      .select()
      .from(customBugTypes)
      .orderBy(customBugTypes.name);

    return c.json({ data: bugTypes });
  })
  // Create a new bug type
  .post("/types", sessionMiddleware, zValidator("json", createBugTypeSchema), async (c) => {
    const { name } = c.req.valid("json");

    // Check if bug type already exists
    const existing = await db
      .select()
      .from(customBugTypes)
      .where(eq(customBugTypes.name, name))
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "Bug type already exists" }, 400);
    }

    const [newBugType] = await db
      .insert(customBugTypes)
      .values({ name })
      .returning();

    return c.json({ data: newBugType });
  })
  // Get comments for a specific bug
  .get("/:bugId/comments", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { bugId } = c.req.param();

    // First, check if user has access to this bug (assignee or reporter)
    const [bug] = await db
      .select()
      .from(bugs)
      .where(eq(bugs.bugId, bugId))
      .limit(1);

    if (!bug) {
      return c.json({ error: "Bug not found" }, 404);
    }

    if (bug.assignedTo !== user.id && bug.reportedBy !== user.id) {
      return c.json({ error: "Unauthorized access to bug comments" }, 403);
    }

    // Get all comments for this bug
    const comments = await db
      .select()
      .from(bugComments)
      .where(eq(bugComments.bugId, bug.id))
      .orderBy(bugComments.createdAt);

    return c.json({ data: comments });
  })
  // Create a comment on a bug
  .post(
    "/:bugId/comments",
    sessionMiddleware,
    zValidator("json", z.object({
      comment: z.string().min(1, "Comment cannot be empty"),
      fileUrl: z.string().optional(),
    })),
    async (c) => {
      const user = c.get("user");
      const { bugId } = c.req.param();
      const { comment, fileUrl } = c.req.valid("json");

      // Check if user has access to this bug
      const [bug] = await db
        .select()
        .from(bugs)
        .where(eq(bugs.bugId, bugId))
        .limit(1);

      if (!bug) {
        return c.json({ error: "Bug not found" }, 404);
      }

      if (bug.assignedTo !== user.id && bug.reportedBy !== user.id) {
        return c.json({ error: "Unauthorized: Only assignee or reporter can comment" }, 403);
      }

      // Create the comment
      const [newComment] = await db
        .insert(bugComments)
        .values({
          bugId: bug.id,
          userId: user.id,
          userName: user.name,
          comment,
          fileUrl: fileUrl || null,
          isSystemComment: false,
        })
        .returning();

      // Create notification for the other party
      const notifyUserId = bug.assignedTo === user.id ? bug.reportedBy : bug.assignedTo;
      
      if (notifyUserId) {
        await db.insert(notifications).values({
          userId: notifyUserId,
          type: "BUG_COMMENT",
          title: `New comment on ${bug.bugId}`,
          message: `${user.name} commented: ${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}`,
          actionBy: user.id,
          actionByName: user.name,
        });
      }

      return c.json({ data: newComment });
    }
  );

export default app;
