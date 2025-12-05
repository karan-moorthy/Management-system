import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, and } from "drizzle-orm";

import { db } from "@/db/index";
import { workflows, boardColumns } from "@/db/schema";
import { sessionMiddleware } from "@/lib/session-middleware";

// Schema for board column validation
const insertBoardColumnSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1, "Name is required"),
  position: z.number().optional(),
  color: z.string().optional(),
  category: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
});

const app = new Hono()
  // ============= WORKFLOWS =============
  
  // Get all workflows for workspace
  .get(
    "/workflows",
    sessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("query");
      
      const workflowsList = await db
        .select()
        .from(workflows)
        .where(eq(workflows.workspaceId, workspaceId));
      
      return c.json({ data: workflowsList });
    }
  )
  
  // Create workflow
  .post(
    "/workflows",
    sessionMiddleware,
    zValidator("json", z.object({
      workspaceId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      statuses: z.array(z.object({
        key: z.string(),
        name: z.string(),
        category: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
        color: z.string().optional(),
      })),
      transitions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        from: z.string(),
        to: z.string(),
        rules: z.any().optional(),
      })).optional(),
      isDefault: z.boolean().default(false),
    })),
    async (c) => {
      const data = c.req.valid("json");
      
      const [workflow] = await db
        .insert(workflows)
        .values({
          workspaceId: data.workspaceId,
          name: data.name,
          description: data.description,
          statuses: data.statuses,
          transitions: data.transitions || [],
          isDefault: data.isDefault,
        })
        .returning();
      
      return c.json({ data: workflow });
    }
  )
  
  // Update workflow
  .patch(
    "/workflows/:id",
    sessionMiddleware,
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      statuses: z.array(z.object({
        key: z.string(),
        name: z.string(),
        category: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
        color: z.string().optional(),
      })).optional(),
      transitions: z.array(z.object({
        id: z.string(),
        name: z.string(),
        from: z.string(),
        to: z.string(),
        rules: z.any().optional(),
      })).optional(),
      isDefault: z.boolean().optional(),
    })),
    async (c) => {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");
      
      const [workflow] = await db
        .update(workflows)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, id))
        .returning();
      
      if (!workflow) {
        return c.json({ error: "Workflow not found" }, 404);
      }
      
      return c.json({ data: workflow });
    }
  )
  
  // Add status to workflow
  .post(
    "/workflows/:id/statuses",
    sessionMiddleware,
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", z.object({
      status: z.object({
        key: z.string(),
        name: z.string(),
        category: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
        color: z.string().optional(),
      }),
    })),
    async (c) => {
      const { id } = c.req.valid("param");
      const { status } = c.req.valid("json");
      
      // Get current workflow
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, id));
      
      if (!workflow) {
        return c.json({ error: "Workflow not found" }, 404);
      }
      
      // Add new status to statuses array
      const currentStatuses = workflow.statuses as any[];
      const updatedStatuses = [...currentStatuses, status];
      
      // Update workflow
      const [updatedWorkflow] = await db
        .update(workflows)
        .set({
          statuses: updatedStatuses,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, id))
        .returning();
      
      return c.json({ data: updatedWorkflow });
    }
  )

  // ============= BOARD COLUMNS (JIRA-STYLE) =============
  
  // Get all columns for workspace
  .get(
    "/board-columns",
    sessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("query");
      
      const columns = await db
        .select()
        .from(boardColumns)
        .where(eq(boardColumns.workspaceId, workspaceId))
        .orderBy(boardColumns.position);
      
      return c.json({ data: columns });
    }
  )
  
  // Create new column
  .post(
    "/board-columns",
    sessionMiddleware,
    zValidator("json", insertBoardColumnSchema),
    async (c) => {
      const { workspaceId, name, position, color, category } = c.req.valid("json");
      
      const [column] = await db
        .insert(boardColumns)
        .values({
          workspaceId,
          name,
          position: position ?? 999,
          color: color ?? '#808080',
          category,
          isDefault: false,
        })
        .returning();
      
      return c.json({ data: column });
    }
  )
  
  // Update column
  .patch(
    "/board-columns/:id",
    sessionMiddleware,
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", z.object({
      name: z.string().optional(),
      position: z.number().optional(),
      color: z.string().optional(),
      category: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    })),
    async (c) => {
      const { id } = c.req.valid("param");
      const data = c.req.valid("json");
      
      const [column] = await db
        .update(boardColumns)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(boardColumns.id, id))
        .returning();
      
      if (!column) {
        return c.json({ error: "Column not found" }, 404);
      }
      
      return c.json({ data: column });
    }
  )
  
  // Delete column
  .delete(
    "/board-columns/:id",
    sessionMiddleware,
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      
      // Check if column is default
      const [column] = await db
        .select()
        .from(boardColumns)
        .where(eq(boardColumns.id, id));
      
      if (column?.isDefault) {
        return c.json({ error: "Cannot delete default columns" }, 400);
      }
      
      await db
        .delete(boardColumns)
        .where(eq(boardColumns.id, id));
      
      return c.json({ success: true });
    }
  );

export default app;
