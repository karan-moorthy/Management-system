import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc, or, like, sql, inArray } from "drizzle-orm";

import { sessionMiddleware } from "@/lib/session-middleware";
import { db } from "@/db";
import { tasks, projects, users } from "@/db/schema";
import { getMember } from "@/features/members/utils";
import { MemberRole } from "@/features/members/types";

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

      // RBAC: Only ADMIN and PROJECT_MANAGER can delete tasks
      const allowedRoles = [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER];
      if (!allowedRoles.includes(member.role as MemberRole)) {
        return c.json({ error: "Forbidden: Only admins and project managers can delete tasks" }, 403);
      }
    }
    // For tasks without workspace (CSV uploads), allow deletion by any authenticated user
    // In production, you might want to add additional checks here

    await db.delete(tasks).where(eq(tasks.id, taskId));

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
        limit: z.string().optional().transform(val => val ? parseInt(val) : 100),
        offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const { workspaceId, projectId, assigneeId, status, search, dueDate, limit, offset } =
        c.req.valid("query");

      // If workspaceId is provided, check membership (legacy support)
      if (workspaceId) {
        const member = await getMember({
          workspaceId,
          userId: user.id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }
      }

      // Build where conditions
      const conditions = [];
      
      // Only filter by workspace if provided (legacy support)
      if (workspaceId) {
        conditions.push(eq(tasks.workspaceId, workspaceId));
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

      if (search) {
        conditions.push(
          or(
            like(tasks.summary, `%${search}%`),
            like(tasks.description, `%${search}%`)
          )!
        );
      }

      const taskList = await db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.created))
        .limit(Math.min(limit || 100, 2000)) // Max 2000 tasks per request to support large CSV uploads
        .offset(offset || 0);

      // Get unique assignee and project IDs (filter out nulls)
      const assigneeIds = Array.from(new Set(taskList.map((t) => t.assigneeId).filter(Boolean))) as string[];
      const projectIds = Array.from(new Set(taskList.map((t) => t.projectId).filter(Boolean))) as string[];

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
        summary,
        issueId,
        issueType,
        status,
        projectName,
        workspaceId,
        projectId,
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

        // RBAC: All roles except MANAGEMENT can create tasks
        if (member.role === MemberRole.MANAGEMENT) {
          return c.json({ error: "Forbidden: Management role cannot create tasks" }, 403);
        }
      }

      // Get highest position by projectId instead of workspaceId
      const [highestPositionTask] = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, projectId),
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
          summary,
          issueId,
          issueType: issueType || "Task",
          status,
          projectName,
          priority: priority || "Medium",
          resolution,
          assigneeId,
          reporterId,
          creatorId: creatorId || user.id,
          description,
          projectId,
          workspaceId: null,
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedHours,
          actualHours: 0,
          labels: labels ? JSON.stringify(labels) : null,
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

      return c.json({ data: task });
    }
  )
  .get("/:taskId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { taskId } = c.req.param();

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
          id: users.id,
          name: users.name,
          email: users.email,
        },
        project: {
          id: projects.id,
          name: projects.name,
          imageUrl: projects.imageUrl,
        },
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
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
        
        // Find all user IDs by name or email (assignee, reporter, creator from columns 8, 9, 10)
        const userNamesSet = new Set();
        rowsData.slice(1).forEach(row => {
          if (row[8]) userNamesSet.add(row[8].trim()); // Assignee
          if (row[9]) userNamesSet.add(row[9].trim()); // Reporter
          if (row[10]) userNamesSet.add(row[10].trim()); // Creator
        });
        const userNames = Array.from(userNamesSet).filter(Boolean) as string[];
        const assigneeMap = new Map();
        
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

        // Process rows in batches for better performance (100x faster than row-by-row)
        const BATCH_SIZE = 100;
        const taskDataBatch = [];
        
        for (let i = 1; i < rowsData.length; i++) {
          const row = rowsData[i];
          
          if (row.length < 2 || !row[1]) continue; // Skip empty rows - Summary must have content
          
          // Map CSV columns to fields
          // Expected columns: Summary, Summary id, Issue id, Issue Type, Status, Project name, 
          // Priority, Resolution, Assignee, Reporter, Creator, Created, Updated, Resolved, 
          // Due date, Labels, Description, project_id, workspace_id, estimated_hours, actual_hours, position
          
          const summary = row[0]?.trim() || '';
          const summaryId = row[1]?.trim() || '';
          const issueId = row[2]?.trim() || `TASK-${Date.now()}-${i}`;
          const issueType = row[3]?.trim() || 'Task';
          const status = row[4]?.trim() || TaskStatus.TODO;
          const projectName = row[5]?.trim() || project.name;
          const priority = row[6]?.trim() || TaskPriority.MEDIUM;
          const resolution = row[7]?.trim() || null;
          const assigneeValue = row[8]?.trim() || '';
          const reporterValue = row[9]?.trim() || '';
          const creatorValue = row[10]?.trim() || '';
          const createdValue = row[11]?.trim() || '';
          const updatedValue = row[12]?.trim() || '';
          const resolvedValue = row[13]?.trim() || '';
          const dueDate = row[14]?.trim() || '';
          const labels = row[15]?.trim() || '';
          const description = row[16]?.trim() || '';
          const csvProjectId = row[17]?.trim() || '';
          const csvWorkspaceId = row[18]?.trim() || '';
          const estimatedHours = row[19]?.trim() || '';
          const actualHours = row[20]?.trim() || '';
          const positionValue = row[21]?.trim() || '';
          
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
          let assigneeId = assigneeMap.get(assigneeValue) || user.id;
          
          // Find reporter ID (or use current user)
          let reporterId = assigneeMap.get(reporterValue) || user.id;
          
          // Find creator ID (or use current user)
          let creatorId = assigneeMap.get(creatorValue) || user.id;
          
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
            position: parsedPosition,
            // Upload tracking
            uploadBatchId: uploadBatchId,
            uploadedAt: uploadedAt,
            uploadedBy: user.id,
          };

          taskDataBatch.push(taskData);
          
          // Insert batch when it reaches BATCH_SIZE or at the end
          if (taskDataBatch.length >= BATCH_SIZE || i === rowsData.length - 1) {
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
                } catch (singleError) {
                  console.error(`❌ Failed to insert task: ${failedTask.summary}`, singleError);
                }
              }
              taskDataBatch.length = 0; // Clear batch
            }
          }
        }

        console.log(`\n🎉 Upload complete! Created ${createdTasks.length} tasks`);

        return c.json({ 
          data: { 
            message: `Successfully imported ${createdTasks.length} tasks`,
            uploadBatchId: uploadBatchId,
            tasks: createdTasks 
          } 
        });
        
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
