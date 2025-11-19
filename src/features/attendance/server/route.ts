import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { attendance, members, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { MemberRole } from "@/features/members/types";
import { sessionMiddleware } from "@/lib/session-middleware";
import { autoEndExpiredShifts } from "../utils/auto-end-shifts";

const app = new Hono()
  // Start Shift
  .post(
    "/start-shift",
    sessionMiddleware,
    zValidator("json", z.object({
      projectId: z.string().optional(),
    })),
    async (c) => {
      const user = c.get("user");
      const { projectId } = c.req.valid("json");

      console.log("Start shift request:", { userId: user?.id, projectId });

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      try {
        // Check if there's already an active shift
        const activeShift = await db.query.attendance.findFirst({
          where: and(
            eq(attendance.userId, user.id),
            eq(attendance.status, "IN_PROGRESS")
          ),
        });

        if (activeShift) {
          console.log("User already has active shift:", activeShift.id);
          return c.json({ error: "You already have an active shift" }, 400);
        }

        // Create new attendance record (workspaceId can be null)
        const [newAttendance] = await db.insert(attendance).values({
          userId: user.id,
          workspaceId: null, // No workspace concept
          projectId: projectId || null,
          shiftStartTime: new Date(),
          status: "IN_PROGRESS",
        }).returning();

        return c.json({ data: newAttendance });
      } catch (error) {
        console.error("Error in start-shift:", error);
        console.error("Details:", {
          userId: user.id,
          projectId,
          error: error instanceof Error ? error.message : String(error)
        });
        return c.json({ 
          error: "Failed to start shift", 
          details: error instanceof Error ? error.message : String(error)
        }, 500);
      }
    }
  )
  
  // End Shift
  .post(
    "/end-shift",
    sessionMiddleware,
    zValidator("json", z.object({
      attendanceId: z.string(),
      endActivity: z.string().min(1, "Please describe your end activity"),
      dailyTasks: z.array(z.string()).min(1, "Please add at least one task"),
    })),
    async (c) => {
      const user = c.get("user");
      const { attendanceId, endActivity, dailyTasks } = c.req.valid("json");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get the attendance record
      const attendanceRecord = await db.query.attendance.findFirst({
        where: eq(attendance.id, attendanceId),
      });

      if (!attendanceRecord) {
        return c.json({ error: "Attendance record not found" }, 404);
      }

      if (attendanceRecord.userId !== user.id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      if (attendanceRecord.status === "COMPLETED") {
        return c.json({ error: "Shift already ended" }, 400);
      }

      // Calculate duration in minutes
      const shiftEndTime = new Date();
      const duration = Math.floor(
        (shiftEndTime.getTime() - new Date(attendanceRecord.shiftStartTime).getTime()) / (1000 * 60)
      );

      // Update attendance record
      const [updatedAttendance] = await db
        .update(attendance)
        .set({
          shiftEndTime,
          totalDuration: duration,
          endActivity,
          dailyTasks,
          status: "COMPLETED",
          updatedAt: new Date(),
        })
        .where(eq(attendance.id, attendanceId))
        .returning();

      return c.json({ data: updatedAttendance });
    }
  )
  
  // Get Active Shift
  .get(
    "/active-shift",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get active shift for current user
      const activeShift = await db.query.attendance.findFirst({
        where: and(
          eq(attendance.userId, user.id),
          eq(attendance.status, "IN_PROGRESS")
        ),
      });

      // Check if shift should auto-end at midnight
      if (activeShift) {
        const shiftStart = new Date(activeShift.shiftStartTime);
        const now = new Date();
        
        // Get midnight of the day after shift started
        const midnightAfterShift = new Date(shiftStart);
        midnightAfterShift.setHours(24, 0, 0, 0);
        
        // If current time is past midnight, auto-end the shift
        if (now >= midnightAfterShift) {
          const duration = Math.floor(
            (midnightAfterShift.getTime() - shiftStart.getTime()) / (1000 * 60)
          );

          // Auto-end at midnight
          const [updatedShift] = await db
            .update(attendance)
            .set({
              shiftEndTime: midnightAfterShift,
              totalDuration: duration,
              endActivity: "Shift automatically ended at midnight",
              dailyTasks: ["Auto-ended at midnight - No tasks entered"],
              status: "COMPLETED",
              updatedAt: new Date(),
            })
            .where(eq(attendance.id, activeShift.id))
            .returning();

          // Return null so UI shows no active shift
          return c.json({ data: null });
        }
      }

      return c.json({ data: activeShift || null });
    }
  )
  
  // Get My Attendance History (Employee's own records)
  .get(
    "/my-attendance",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get user's own completed attendance records from ALL workspaces
      const records = await db
        .select({
          id: attendance.id,
          projectId: attendance.projectId,
          shiftStartTime: attendance.shiftStartTime,
          shiftEndTime: attendance.shiftEndTime,
          totalDuration: attendance.totalDuration,
          endActivity: attendance.endActivity,
          dailyTasks: attendance.dailyTasks,
          status: attendance.status,
          createdAt: attendance.createdAt,
        })
        .from(attendance)
        .where(and(
          eq(attendance.userId, user.id),
          eq(attendance.status, "COMPLETED")
        ))
        .orderBy(desc(attendance.shiftStartTime));

      return c.json({ data: records });
    }
  )
  
  // Update Daily Tasks (Employee can edit their own tasks)
  .patch(
    "/update-tasks/:attendanceId",
    sessionMiddleware,
    zValidator("json", z.object({
      dailyTasks: z.array(z.string()).min(1, "Please add at least one task"),
    })),
    async (c) => {
      const user = c.get("user");
      const { attendanceId } = c.req.param();
      const { dailyTasks } = c.req.valid("json");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get the attendance record
      const record = await db.query.attendance.findFirst({
        where: eq(attendance.id, attendanceId),
      });

      if (!record) {
        return c.json({ error: "Attendance record not found" }, 404);
      }

      if (record.userId !== user.id) {
        return c.json({ error: "Unauthorized - You can only edit your own tasks" }, 401);
      }

      // Update tasks
      const [updated] = await db
        .update(attendance)
        .set({
          dailyTasks,
          updatedAt: new Date(),
        })
        .where(eq(attendance.id, attendanceId))
        .returning();

      return c.json({ data: updated });
    }
  )
  
  // Get All Attendance Records (Admin only)
  .get(
    "/records",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Check if user is admin in ANY workspace
      const member = await db.query.members.findFirst({
        where: and(
          eq(members.userId, user.id),
          eq(members.role, MemberRole.ADMIN)
        ),
      });

      if (!member) {
        return c.json({ error: "Unauthorized - Admin access required" }, 403);
      }

      // Get ALL completed attendance records from ALL workspaces (company-wide)
      const records = await db
        .select({
          id: attendance.id,
          userId: attendance.userId,
          userName: users.name,
          userEmail: users.email,
          projectId: attendance.projectId,
          shiftStartTime: attendance.shiftStartTime,
          shiftEndTime: attendance.shiftEndTime,
          totalDuration: attendance.totalDuration,
          endActivity: attendance.endActivity,
          dailyTasks: attendance.dailyTasks,
          status: attendance.status,
          createdAt: attendance.createdAt,
        })
        .from(attendance)
        .innerJoin(users, eq(attendance.userId, users.id))
        .where(eq(attendance.status, "COMPLETED"))
        .orderBy(desc(attendance.shiftStartTime));

      return c.json({ data: records });
    }
  )
  
  // Auto-end expired shifts (can be called by cron job or manually)
  .post(
    "/auto-end-expired",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Check if user is admin
      const member = await db.query.members.findFirst({
        where: and(
          eq(members.userId, user.id),
          eq(members.role, MemberRole.ADMIN)
        ),
      });

      if (!member) {
        return c.json({ error: "Unauthorized - Admin access required" }, 403);
      }

      const result = await autoEndExpiredShifts();
      return c.json({ data: result });
    }
  );

export default app;
