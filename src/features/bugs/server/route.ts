import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { bugs, customBugTypes, users, notifications } from "@/db/schema";
import { createBugSchema, updateBugSchema, createBugTypeSchema } from "../schemas";
import { sessionMiddleware } from "@/lib/session-middleware";

const app = new Hono()
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
      if (updates.status === "Resolved" || updates.status === "Closed") {
        updateData.resolvedAt = new Date();
      }
    }

    if (updates.priority) {
      updateData.priority = updates.priority;
    }

    if (updates.assignedTo) {
      updateData.assignedTo = updates.assignedTo;
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
  });

export default app;
