import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc, sql } from "drizzle-orm";

import { db } from "@/db/index";
import { listViewColumns } from "@/db/schema";
import { sessionMiddleware } from "@/lib/session-middleware";

// Schema for list view column validation
const insertListViewColumnSchema = z.object({
  projectId: z.string().uuid(),
  fieldName: z.string().min(1, "Field name is required"),
  displayName: z.string().min(1, "Display name is required"),
  columnType: z.enum(['text', 'select', 'user', 'date', 'labels', 'priority']),
  width: z.number().optional(),
  position: z.number().optional(),
  isVisible: z.boolean().optional(),
  isSortable: z.boolean().optional(),
  isFilterable: z.boolean().optional(),
});

const updateListViewColumnSchema = z.object({
  displayName: z.string().min(1).optional(),
  width: z.number().optional(),
  position: z.number().optional(),
  isVisible: z.boolean().optional(),
});

const reorderColumnsSchema = z.object({
  columns: z.array(z.object({
    id: z.string().uuid(),
    position: z.number(),
  })),
});

const app = new Hono()
  // Get all list view columns for a project
  .get(
    "/columns",
    sessionMiddleware,
    zValidator("query", z.object({ projectId: z.string().uuid() })),
    async (c) => {
      const { projectId } = c.req.valid("query");
      
      console.log('📋 GET /columns request:', { projectId });
      
      const columns = await db
        .select()
        .from(listViewColumns)
        .where(eq(listViewColumns.projectId, projectId))
        .orderBy(listViewColumns.position);
      
      console.log('📊 Found columns:', {
        projectId,
        count: columns.length,
        columns: columns.map(c => ({ id: c.id.slice(0, 8), fieldName: c.fieldName, displayName: c.displayName, isVisible: c.isVisible }))
      });
      
      return c.json({ data: columns });
    }
  )
  
  // Create new list view column
  .post(
    "/columns",
    sessionMiddleware,
    zValidator("json", insertListViewColumnSchema),
    async (c) => {
      const data = c.req.valid("json");
      
      // Get the next position if not provided
      if (data.position === undefined) {
        const maxPosition = await db
          .select({ maxPos: listViewColumns.position })
          .from(listViewColumns)
          .where(eq(listViewColumns.projectId, data.projectId))
          .orderBy(desc(listViewColumns.position))
          .limit(1);
        
        data.position = (maxPosition[0]?.maxPos ?? -1) + 1;
      }
      
      const [column] = await db
        .insert(listViewColumns)
        .values({
          ...data,
          isSystem: false, // User-created columns are never system columns
        })
        .returning();
      
      return c.json({ data: column });
    }
  )
  
  // Update a list view column
  .patch(
    "/columns/:id",
    sessionMiddleware,
    zValidator("json", updateListViewColumnSchema),
    async (c) => {
      const { id } = c.req.param();
      const updates = c.req.valid("json");
      
      // Check if column exists and is not a system column for certain operations
      const [column] = await db
        .select()
        .from(listViewColumns)
        .where(eq(listViewColumns.id, id))
        .limit(1);
      
      if (!column) {
        return c.json({ error: "Column not found" }, 404);
      }
      
      const [updatedColumn] = await db
        .update(listViewColumns)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(listViewColumns.id, id))
        .returning();
      
      return c.json({ data: updatedColumn });
    }
  )
  
  // Bulk reorder columns
  .post(
    "/columns/reorder",
    sessionMiddleware,
    zValidator("json", reorderColumnsSchema),
    async (c) => {
      const { columns: columnUpdates } = c.req.valid("json");
      
      // Update each column's position
      const updatePromises = columnUpdates.map(({ id, position }) =>
        db
          .update(listViewColumns)
          .set({ position, updatedAt: sql`NOW()` })
          .where(eq(listViewColumns.id, id))
      );
      
      await Promise.all(updatePromises);
      
      return c.json({ success: true });
    }
  )
  
  // Delete a list view column
  .delete(
    "/columns/:id",
    sessionMiddleware,
    async (c) => {
      const { id } = c.req.param();
      
      // Check if it's a system column
      const [column] = await db
        .select()
        .from(listViewColumns)
        .where(eq(listViewColumns.id, id))
        .limit(1);
      
      if (!column) {
        return c.json({ error: "Column not found" }, 404);
      }
      
      if (column.isSystem) {
        return c.json({ error: "Cannot delete system columns" }, 403);
      }
      
      await db
        .delete(listViewColumns)
        .where(eq(listViewColumns.id, id));
      
      return c.json({ success: true });
    }
  );

export default app;
