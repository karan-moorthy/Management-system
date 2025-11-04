import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, or, like, sql, inArray } from "drizzle-orm";

import { sessionMiddleware } from "@/lib/session-middleware";
import { db } from "@/db";
import { tasks, projects, users } from "@/db/schema";
import { getMember } from "@/features/members/utils";

import { createTaskSchema } from "../schemas";
import { TaskStatus, TaskPriority, TaskImportance } from "../types";

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
        ? await db.select().from(users).where(inArray(users.id, assigneeIds))
        : [];

      // Fetch projects  
      const projectsData = projectIds.length > 0
        ? await db.select().from(projects).where(inArray(projects.id, projectIds))
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
        .where(inArray(tasks.id, taskIds));

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
  )
  .post(
    "/upload-excel",
    sessionMiddleware,
    async (c) => {
      try {
        const user = c.get("user");
        const formData = await c.req.formData();
        
        const file = formData.get('file') as File;
        const workspaceId = formData.get('workspaceId') as string;
        const projectId = formData.get('projectId') as string;

        if (!file) {
          return c.json({ error: "No file uploaded" }, 400);
        }

        if (!workspaceId || !projectId) {
          return c.json({ error: "Workspace ID and Project ID are required" }, 400);
        }

        // Verify user is member of workspace
        const member = await getMember({
          workspaceId,
          userId: user.id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        // Get project to verify it exists
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1);

        if (!project) {
          return c.json({ error: "Project not found" }, 404);
        }

        // Check if file is CSV or Excel
        const fileName = file.name.toLowerCase();
        let rowsData: string[][] = [];
        
        if (fileName.endsWith('.csv')) {
          // Handle CSV files
          const fileContent = await file.text();
          const lines = fileContent.split('\n').filter(line => line.trim());
          rowsData = lines.map(line => 
            line.split(',').map(cell => cell.trim().replace(/"/g, ''))
          );
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
        
        // Find assignee IDs by name or email
        const assigneeNamesSet = new Set(rowsData.slice(1).map(row => row[4]).filter(Boolean));
        const assigneeNames = Array.from(assigneeNamesSet);
        const assigneeMap = new Map();
        
        if (assigneeNames.length > 0) {
          const assignees = await db
            .select()
            .from(users)
            .where(
              or(
                inArray(users.name, assigneeNames),
                inArray(users.email, assigneeNames)
              )!
            );
          
          assignees.forEach(assignee => {
            assigneeMap.set(assignee.name, assignee.id);
            assigneeMap.set(assignee.email, assignee.id);
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

        // Process each row (skip header)
        for (let i = 1; i < rowsData.length; i++) {
          const row = rowsData[i];
          
          if (row.length < 2 || !row[1]) continue; // Skip empty rows (Story column must have content)
          
          const epic = row[0]?.trim() || '';
          const story = row[1]?.trim() || '';
          const plannedStart = row[2]?.trim() || '';
          const plannedCompletion = row[3]?.trim() || '';
          const responsibility = row[4]?.trim() || '';
          
          // Find assignee ID
          let assigneeId = assigneeMap.get(responsibility) || user.id;
          
          const taskData = {
            name: story,
            description: `Epic: ${epic}\nPlanned Start: ${plannedStart}`,
            status: TaskStatus.TODO,
            priority: TaskPriority.MEDIUM,
            importance: TaskImportance.MEDIUM,
            dueDate: parseDate(plannedCompletion),
            category: epic,
            estimatedHours: null,
            workspaceId,
            projectId,
            assigneeId,
            position: 1000 + i,
          };

          try {
            const [newTask] = await db
              .insert(tasks)
              .values(taskData)
              .returning();
            
            createdTasks.push(newTask);
          } catch (error) {
            console.error(`Error creating task from row ${i}:`, error);
            console.error('Task data:', taskData);
          }
        }

        return c.json({ 
          data: { 
            message: `Successfully imported ${createdTasks.length} tasks`,
            tasks: createdTasks 
          } 
        });
        
      } catch (error) {
        console.error('Excel upload error:', error);
        return c.json({ error: "Failed to process Excel file" }, 500);
      }
    }
  );

export default app;
