import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";

import { db } from "@/db";
import { taskOverviews, tasks, users, notifications, activityLogs, members } from "@/db/schema";
import { sessionMiddleware } from "@/lib/session-middleware";
import { OverviewStatus, TaskStatus } from "@/features/tasks/types";
import { MemberRole } from "@/features/members/types";

const app = new Hono()
  // Create task overview
  .post(
    "/",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        taskId: z.string().uuid(),
        completedWorkDescription: z.string().min(10),
        completionMethod: z.string().min(10),
        stepsFollowed: z.string().min(10),
        proofOfWork: z.object({
          screenshots: z.array(z.string()).optional(),
          files: z.array(z.string()).optional(),
          links: z.array(z.string()).optional(),
          githubCommits: z.array(z.string()).optional(),
        }).passthrough(), // Allow additional fields
        challenges: z.string().optional(),
        additionalRemarks: z.string().optional(),
        timeSpent: z.number().int().min(0).optional(),
      })
    ),
    async (c) => {
      const user = c.get("user");
      
      console.log("📝 Task overview submission started");
      console.log("User ID:", user.id);
      
      let data;
      try {
        data = c.req.valid("json");
        console.log("Validated data:", JSON.stringify(data, null, 2));
      } catch (validationError) {
        console.error("Validation error:", validationError);
        return c.json(
          { success: false, message: "Invalid request data" },
          400
        );
      }

      try {
        console.log("Fetching task:", data.taskId);
        // Verify the task exists and user is assigned to it
        const [task] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, data.taskId))
          .limit(1);

        if (!task) {
          console.log("Task not found");
          return c.json({ success: false, message: "Task not found" }, 404);
        }

        console.log("Task found:", task.issueId);
        console.log("Task assignee:", task.assigneeId, "Current user:", user.id);

        if (task.assigneeId !== user.id) {
          console.log("User not assigned to task");
          return c.json(
            { success: false, message: "You are not assigned to this task" },
            403
          );
        }

        // Check if overview already exists
        console.log("Checking for existing overview");
        const [existingOverview] = await db
          .select()
          .from(taskOverviews)
          .where(eq(taskOverviews.taskId, data.taskId))
          .limit(1);

        if (existingOverview) {
          console.log("Overview already exists with status:", existingOverview.status);
          
          // Allow updating if overview is PENDING or REWORK
          if (existingOverview.status === OverviewStatus.PENDING || existingOverview.status === OverviewStatus.REWORK) {
            console.log(`Updating existing ${existingOverview.status} overview`);
            const [updatedOverview] = await db
              .update(taskOverviews)
              .set({
                completedWorkDescription: data.completedWorkDescription,
                completionMethod: data.completionMethod,
                stepsFollowed: data.stepsFollowed,
                proofOfWork: data.proofOfWork,
                challenges: data.challenges,
                additionalRemarks: data.additionalRemarks,
                timeSpent: data.timeSpent,
                status: OverviewStatus.PENDING, // Reset to PENDING for admin review
                reviewedBy: null, // Clear previous reviewer
                reviewedAt: null, // Clear previous review date
                adminRemarks: null, // Clear previous remarks
                updatedAt: new Date(),
              })
              .where(eq(taskOverviews.id, existingOverview.id))
              .returning();

            console.log("✅ Overview updated successfully, status reset to PENDING");
            return c.json({ success: true, data: updatedOverview });
          }
          
          // If already approved, don't allow resubmission
          return c.json(
            {
              success: false,
              message: `This task overview has already been ${existingOverview.status.toLowerCase()}`,
            },
            409
          );
        }

        // Get employee info
        console.log("Fetching employee info");
        const [employee] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        if (!employee) {
          console.log("Employee not found");
          return c.json({ success: false, message: "User not found" }, 404);
        }

        console.log("Employee found:", employee.name);

        // Create resolved date and time
        const now = new Date();
        const resolvedTime = now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });

        console.log("Creating overview record");
        // Create the overview
        const [overview] = await db
          .insert(taskOverviews)
          .values({
            taskId: data.taskId,
            employeeId: user.id,
            completedWorkDescription: data.completedWorkDescription,
            completionMethod: data.completionMethod,
            stepsFollowed: data.stepsFollowed,
            proofOfWork: data.proofOfWork,
            challenges: data.challenges || null,
            additionalRemarks: data.additionalRemarks || null,
            timeSpent: data.timeSpent || null,
            taskTitle: task.summary,
            employeeName: employee.name,
            resolvedDate: now,
            resolvedTime: resolvedTime,
            status: OverviewStatus.PENDING,
          })
          .returning();

        console.log("Overview created:", overview.id);

        console.log("Overview created:", overview.id);

        // Log activity
        console.log("Logging activity");
        try {
          await db.insert(activityLogs).values({
            actionType: "OVERVIEW_SUBMITTED",
            entityType: "TASK",
            entityId: task.id,
            userId: user.id,
            userName: employee.name,
            workspaceId: task.workspaceId,
            projectId: task.projectId,
            taskId: task.id,
            summary: `${employee.name} submitted completion overview for ${task.issueId}`,
            changes: {
              metadata: {
                overviewId: overview.id,
                taskTitle: task.summary,
                resolvedDate: now.toISOString(),
              },
            },
          });
          console.log("Activity logged successfully");
        } catch (error) {
          console.error("Failed to log overview submission activity:", error);
        }

        console.log("✅ Overview submission successful");
        return c.json({ success: true, data: overview });
      } catch (error) {
        console.error("❌ Failed to create task overview:", error);
        console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
        return c.json(
          { success: false, message: "Failed to submit task overview", error: error instanceof Error ? error.message : String(error) },
          500
        );
      }
    }
  )

  // Get task overviews (admin can see all pending, employees see their own)
  .get("/", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const status = c.req.query("status");
    const taskId = c.req.query("taskId");

    try {
      console.log("📋 Fetching task overviews - User:", user.id);
      console.log("   Status filter:", status || "none");
      console.log("   Task filter:", taskId || "none");

      // Check if user has admin role across ANY workspace (workspace-agnostic)
      const userMemberships = await db
        .select()
        .from(members)
        .where(eq(members.userId, user.id));

      console.log(`   Found ${userMemberships.length} workspace memberships for user`);

      const isAdmin = userMemberships.some(
        (member) =>
          member.role === MemberRole.ADMIN ||
          member.role === MemberRole.PROJECT_MANAGER ||
          member.role === MemberRole.MANAGEMENT
      );

      console.log(`   Is Admin (workspace-agnostic): ${isAdmin}`);

      let query = db.select().from(taskOverviews);

      const conditions = [];

      // Employees can only see their own overviews
      // Admins can see all overviews regardless of workspace
      if (!isAdmin) {
        console.log("   Filtering to employee's own overviews");
        conditions.push(eq(taskOverviews.employeeId, user.id));
      } else {
        console.log("   Admin access: showing all overviews");
      }

      if (status) {
        console.log(`   Filtering by status: ${status}`);
        conditions.push(eq(taskOverviews.status, status));
      }

      if (taskId) {
        console.log(`   Filtering by taskId: ${taskId}`);
        conditions.push(eq(taskOverviews.taskId, taskId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const overviews = await query.orderBy(desc(taskOverviews.createdAt));

      console.log(`✅ Retrieved ${overviews.length} task overviews`);
      if (overviews.length > 0) {
        console.log("   First overview:", {
          id: overviews[0].id,
          taskId: overviews[0].taskId,
          status: overviews[0].status,
          employee: overviews[0].employeeName,
        });
      }

      return c.json({ success: true, data: overviews });
    } catch (error) {
      console.error("❌ Failed to fetch task overviews:", error);
      return c.json(
        { success: false, message: "Failed to fetch task overviews" },
        500
      );
    }
  })

  // Review task overview (admin only)
  .patch(
    "/:overviewId/review",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        status: z.enum([OverviewStatus.APPROVED, OverviewStatus.REWORK]),
        adminRemarks: z.string().optional(),
        reworkDueDate: z.string().optional(),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const { overviewId } = c.req.param();
      const { status, adminRemarks, reworkDueDate } = c.req.valid("json");

      try {
        // Get the overview first to check workspace
        const [overview] = await db
          .select()
          .from(taskOverviews)
          .where(eq(taskOverviews.id, overviewId))
          .limit(1);

        if (!overview) {
          return c.json(
            { success: false, message: "Overview not found" },
            404
          );
        }

        // Get the task to check workspace
        const [task] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, overview.taskId))
          .limit(1);

        if (!task) {
          return c.json({ success: false, message: "Task not found" }, 404);
        }

        // Verify user is admin/project manager in the workspace
        if (task.workspaceId) {
          const [member] = await db
            .select()
            .from(members)
            .where(
              and(
                eq(members.workspaceId, task.workspaceId),
                eq(members.userId, user.id)
              )
            )
            .limit(1);

          const isAdmin = member && (
            member.role === MemberRole.ADMIN || 
            member.role === MemberRole.PROJECT_MANAGER ||
            member.role === MemberRole.MANAGEMENT
          );

          if (!isAdmin) {
            return c.json(
              { success: false, message: "Only admins can review task overviews" },
              403
            );
          }
        }

        // Update the overview
        const [updatedOverview] = await db
          .update(taskOverviews)
          .set({
            status,
            adminRemarks,
            reviewedBy: user.id,
            reviewedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(taskOverviews.id, overviewId))
          .returning();

        // If approved, update task status to Done and set resolved date/time
        if (status === OverviewStatus.APPROVED) {
          await db
            .update(tasks)
            .set({
              status: TaskStatus.DONE,
              resolved: overview.resolvedDate,
              updated: new Date(),
            })
            .where(eq(tasks.id, overview.taskId));

          // Log activity
          try {
            await db.insert(activityLogs).values({
              actionType: "TASK_APPROVED",
              entityType: "TASK",
              entityId: task.id,
              userId: user.id,
              userName: user.name,
              workspaceId: task.workspaceId,
              projectId: task.projectId,
              taskId: task.id,
              summary: `${user.name} approved task ${task.issueId} - moved to Done`,
              changes: {
                field: "status",
                oldValue: task.status,
                newValue: TaskStatus.DONE,
                metadata: {
                  overviewId: overview.id,
                  resolvedDate: overview.resolvedDate?.toISOString(),
                  adminRemarks,
                },
              },
            });
          } catch (error) {
            console.error("Failed to log task approval activity:", error);
          }

          // Send notification to employee
          if (task.assigneeId) {
            try {
              await db.insert(notifications).values({
                userId: task.assigneeId,
                taskId: task.id,
                type: "TASK_APPROVED",
                title: "Task Approved",
                message: `Your task "${task.summary}" has been approved and moved to Done.${
                  adminRemarks ? ` Admin remarks: ${adminRemarks}` : ""
                }`,
                actionBy: user.id,
                actionByName: user.name,
                isRead: "false",
              });
            } catch (error) {
              console.error("Failed to send task approval notification:", error);
            }
          }
        }

        // If rework requested, move task back to IN_PROGRESS
        if (status === OverviewStatus.REWORK) {
          // Update task status and due date if provided
          const taskUpdateData: any = {
            status: TaskStatus.IN_PROGRESS,
            updated: new Date(),
          };

          // Set new due date if provided (convert string to Date object)
          if (reworkDueDate) {
            taskUpdateData.dueDate = new Date(reworkDueDate);
          }

          await db
            .update(tasks)
            .set(taskUpdateData)
            .where(eq(tasks.id, overview.taskId));

          // Clear "In Review" notifications for admins
          try {
            await db
              .delete(notifications)
              .where(
                and(
                  eq(notifications.taskId, task.id),
                  eq(notifications.type, "TASK_IN_REVIEW"),
                  eq(notifications.isRead, "false")
                )
              );
            console.log(`✅ Cleared IN_REVIEW notifications for task: ${task.issueId}`);
          } catch (error) {
            console.error("Failed to clear IN_REVIEW notifications:", error);
          }

          // Log activity
          try {
            await db.insert(activityLogs).values({
              actionType: "TASK_REWORK_REQUESTED",
              entityType: "TASK",
              entityId: task.id,
              userId: user.id,
              userName: user.name,
              workspaceId: task.workspaceId,
              projectId: task.projectId,
              taskId: task.id,
              summary: `${user.name} requested rework on ${task.issueId} - moved back to In Progress`,
              changes: {
                field: "status",
                oldValue: task.status,
                newValue: TaskStatus.IN_PROGRESS,
                metadata: {
                  overviewId: overview.id,
                  adminRemarks,
                },
              },
            });
          } catch (error) {
            console.error("Failed to log rework request activity:", error);
          }

          // Send notification to employee with output files
          if (task.assigneeId) {
            try {
              // Build message with admin remarks prominently
              let title = "Rework Requested";
              let message = `Task "${task.summary}" needs rework and has been moved to In Progress.`;
              
              // Add admin remarks as the primary information
              if (adminRemarks && adminRemarks.trim()) {
                message = `Admin Feedback: ${adminRemarks}\n\nTask "${task.summary}" has been moved to In Progress for rework.`;
              }

              // Add due date if provided
              if (reworkDueDate) {
                const dueDate = new Date(reworkDueDate);
                message += `\n\nDue Date: ${dueDate.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}`;
              }

              // Add proof of work summary at the end
              const proofOfWork = overview.proofOfWork as any;
              if (proofOfWork) {
                const fileCount = (proofOfWork.files?.length || 0) + 
                                (proofOfWork.screenshots?.length || 0);
                const linkCount = proofOfWork.links?.length || 0;
                const commitCount = proofOfWork.githubCommits?.length || 0;
                
                if (fileCount > 0 || linkCount > 0 || commitCount > 0) {
                  const parts = [];
                  if (fileCount > 0) parts.push(`${fileCount} file(s)`);
                  if (linkCount > 0) parts.push(`${linkCount} link(s)`);
                  if (commitCount > 0) parts.push(`${commitCount} commit(s)`);
                  message += `\n\nYour submission: ${parts.join(', ')}`;
                }
              }

              await db.insert(notifications).values({
                userId: task.assigneeId,
                taskId: task.id,
                type: "TASK_REWORK",
                title,
                message,
                actionBy: user.id,
                actionByName: user.name,
                isRead: "false",
              });
            } catch (error) {
              console.error("Failed to send rework notification:", error);
            }
          }
        }

        return c.json({ success: true, data: updatedOverview });
      } catch (error) {
        console.error("Failed to review task overview:", error);
        return c.json(
          { success: false, message: "Failed to review task overview" },
          500
        );
      }
    }
  );

export default app;
