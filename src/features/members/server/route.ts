import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, inArray } from "drizzle-orm";

import { sessionMiddleware } from "@/lib/session-middleware";
import { db, sql_client } from "@/db";
import { members, users, tasks, sessions } from "@/db/schema";

import { getMember } from "../utils";
import { MemberRole } from "../types";

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
    "/add-direct",
    sessionMiddleware,
    zValidator("json", z.object({
      email: z.string().email("Please enter a valid email address"),
      workspaceId: z.string().min(1, "Workspace ID is required"),
      role: z.nativeEnum(MemberRole).optional().default(MemberRole.MEMBER),
    })),
    async (c) => {
      const user = c.get("user");
      const { email, workspaceId, role } = c.req.valid("json");

      // Check if current user is admin of the workspace
      const currentMember = await getMember({
        workspaceId,
        userId: user.id,
      });

      // RBAC: Only ADMIN and PROJECT_MANAGER can add members
      const allowedRoles = [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER];
      if (!currentMember || !allowedRoles.includes(currentMember.role as MemberRole)) {
        return c.json({ error: "Unauthorized - Only admins and project managers can add members" }, 401);
      }

      try {
        // Find user by email
        const [targetUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        
        if (!targetUser) {
          return c.json({ 
            error: "User not found. The person must create an account first, or use the invitation system." 
          }, 404);
        }

        // Check if user is already a member
        const existingMember = await getMember({
          workspaceId,
          userId: targetUser.id,
        });

        if (existingMember) {
          return c.json({ error: "User is already a member of this workspace" }, 400);
        }

        // Add user as member directly
        const [newMember] = await db
          .insert(members)
          .values({
            userId: targetUser.id,
            workspaceId,
            role,
          })
          .returning();

        return c.json({ 
          data: newMember,
          message: `Successfully added ${email} to workspace`
        });

      } catch (error) {
        console.error("Error adding member directly:", error);
        return c.json({ error: "Failed to add member" }, 500);
      }
    }
  )
  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({ 
      workspaceId: z.string().optional(),
      forTaskAssignment: z.string().optional() // New parameter to get all users for task assignment
    })),
    async (c) => {
      const user = c.get("user");
      const { workspaceId, forTaskAssignment } = c.req.valid("query");

      // Check if user is admin
      const adminCheck = await isUserAdmin(user.id);

      // If no workspaceId provided
      if (!workspaceId) {
        // For task assignment, always return all users (regardless of role)
        if (forTaskAssignment === "true") {
          console.log(`📋 [Task Assignment] Fetching all users for assignee dropdown`);
          const membersList = await db
            .select({
              id: users.id,
              userId: users.id,
              workspaceId: users.id, // Placeholder for compatibility
              role: users.id, // Placeholder
              createdAt: users.createdAt,
              updatedAt: users.updatedAt,
              name: users.name,
              email: users.email,
            })
            .from(users);

          return c.json({
            data: {
              documents: membersList,
              total: membersList.length,
            },
          });
        }
        
        if (adminCheck) {
          // Admins: Return all users
          const membersList = await db
            .select({
              id: users.id,
              userId: users.id,
              workspaceId: users.id, // Placeholder for compatibility
              role: users.id, // Placeholder
              createdAt: users.createdAt,
              updatedAt: users.updatedAt,
              name: users.name,
              email: users.email,
            })
            .from(users);

          return c.json({
            data: {
              documents: membersList,
              total: membersList.length,
            },
          });
        } else {
          // Employees: Return only users who have tasks in the same projects
          // First, get all projects where the employee has tasks
          const employeeProjects = await db
            .select({ projectId: tasks.projectId })
            .from(tasks)
            .where(
              and(
                eq(tasks.assigneeId, user.id),
                // Exclude null projectIds
                // @ts-ignore
                eq(tasks.projectId, tasks.projectId)
              )
            )
            .groupBy(tasks.projectId);
          
          const projectIds = employeeProjects
            .map(p => p.projectId)
            .filter((id): id is string => id !== null);
          
          if (projectIds.length === 0) {
            // No projects, return only self
            const [selfUser] = await db
              .select({
                id: users.id,
                userId: users.id,
                workspaceId: users.id,
                role: users.id,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
                name: users.name,
                email: users.email,
              })
              .from(users)
              .where(eq(users.id, user.id))
              .limit(1);
            
            return c.json({
              data: {
                documents: selfUser ? [selfUser] : [],
                total: selfUser ? 1 : 0,
              },
            });
          }
          
          // Get all users who have tasks in these projects
          const relatedUsers = await db
            .select({ assigneeId: tasks.assigneeId })
            .from(tasks)
            .where(inArray(tasks.projectId, projectIds))
            .groupBy(tasks.assigneeId);
          
          const userIds = relatedUsers
            .map(u => u.assigneeId)
            .filter((id): id is string => id !== null);
          
          if (userIds.length === 0) {
            return c.json({
              data: {
                documents: [],
                total: 0,
              },
            });
          }
          
          const membersList = await db
            .select({
              id: users.id,
              userId: users.id,
              workspaceId: users.id,
              role: users.id,
              createdAt: users.createdAt,
              updatedAt: users.updatedAt,
              name: users.name,
              email: users.email,
            })
            .from(users)
            .where(inArray(users.id, userIds));

          return c.json({
            data: {
              documents: membersList,
              total: membersList.length,
            },
          });
        }
      }

      // Legacy support: filter by workspace if provided
      const member = await getMember({
        workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const membersList = await db
        .select({
          id: members.id,
          userId: members.userId,
          workspaceId: members.workspaceId,
          role: members.role,
          createdAt: members.createdAt,
          updatedAt: members.updatedAt,
          name: users.name,
          email: users.email,
        })
        .from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(eq(members.workspaceId, workspaceId));

      return c.json({
        data: {
          documents: membersList,
          total: membersList.length,
        },
      });
    }
  )
  .delete("/:memberId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { memberId } = c.req.param();

    try {
      const [memberToDelete] = await db
        .select()
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);

      if (!memberToDelete) {
        return c.json({ error: "Member not found" }, 404);
      }

      const currentMember = await getMember({
        workspaceId: memberToDelete.workspaceId,
        userId: user.id,
      });

      if (!currentMember) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // RBAC: Only ADMIN and PROJECT_MANAGER can delete members
      const allowedRoles = [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER];
      if (!allowedRoles.includes(currentMember.role as MemberRole)) {
        return c.json({ error: "Forbidden: Only admins and project managers can remove members" }, 403);
      }

      if (memberToDelete.userId === user.id) {
        return c.json({ error: "Cannot delete yourself" }, 400);
      }

      console.log(`[Delete Member] Attempting to delete member ${memberId} (userId: ${memberToDelete.userId})`);

      // Step 1: Delete all active sessions for this user (log them out everywhere)
      const deletedSessions = await db
        .delete(sessions)
        .where(eq(sessions.userId, memberToDelete.userId))
        .returning();
      
      console.log(`[Delete Member] Cleared ${deletedSessions.length} active session(s) for user ${memberToDelete.userId}`);

      // Step 2: Remove member from workspace (keeps user account and historical data intact)
      await db.delete(members).where(eq(members.id, memberId));

      console.log(`[Delete Member] Successfully removed member ${memberId} from workspace. Historical data (tasks, reports, attendance) preserved.`);

      return c.json({ 
        data: { 
          id: memberId,
          sessionsCleared: deletedSessions.length 
        } 
      });
    } catch (error) {
      console.error("[Delete Member] Error:", error);
      return c.json({ 
        error: "Failed to delete member. Please try again or contact support.",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 500);
    }
  })
  .patch(
    "/:memberId",
    sessionMiddleware,
    zValidator("json", z.object({ role: z.nativeEnum(MemberRole) })),
    async (c) => {
      const user = c.get("user");
      const { memberId } = c.req.param();
      const { role } = c.req.valid("json");

      const [memberToUpdate] = await db
        .select()
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);

      if (!memberToUpdate) {
        return c.json({ error: "Member not found" }, 404);
      }

      const currentMember = await getMember({
        workspaceId: memberToUpdate.workspaceId,
        userId: user.id,
      });

      if (!currentMember) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // RBAC: Only ADMIN and PROJECT_MANAGER can update member roles
      const allowedRoles = [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER];
      if (!allowedRoles.includes(currentMember.role as MemberRole)) {
        return c.json({ error: "Forbidden: Only admins and project managers can update member roles" }, 403);
      }

      if (memberToUpdate.userId === user.id) {
        return c.json({ error: "Cannot update your own role" }, 400);
      }

      const [updatedMember] = await db
        .update(members)
        .set({
          role,
          updatedAt: new Date(),
        })
        .where(eq(members.id, memberId))
        .returning();

      return c.json({ data: updatedMember });
    }
  )
  // Get current member's role in workspace
  .get(
    "/current",
    sessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const user = c.get("user");
      const { workspaceId } = c.req.valid("query");

      const member = await getMember({
        workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json(
          { success: false, message: "You are not a member of this workspace" },
          404
        );
      }

      // Get user details
      const [userDetails] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      return c.json({
        data: {
          ...member,
          name: userDetails?.name || "",
          email: userDetails?.email || "",
        },
      });
    }
  )
  .get("/role", sessionMiddleware, async (c) => {
    const user = c.get("user");

    // Get user's role from ANY workspace (use first one found)
    const [memberRole] = await db
      .select({
        role: members.role,
        workspaceId: members.workspaceId,
      })
      .from(members)
      .where(eq(members.userId, user.id))
      .limit(1);

    if (!memberRole) {
      return c.json({ data: { role: null, workspaceId: null } });
    }

    return c.json({
      data: {
        role: memberRole.role,
        workspaceId: memberRole.workspaceId,
      },
    });
  })
  .get("/all-employees", sessionMiddleware, async (c) => {
    const user = c.get("user");

    // Check if user is admin
    const adminMember = await db.query.members.findFirst({
      where: and(
        eq(members.userId, user.id),
        eq(members.role, MemberRole.ADMIN)
      ),
    });

    if (!adminMember) {
      return c.json({ error: "Unauthorized - Admin access required" }, 403);
    }

    // Get all users (employees)
    const allEmployees = await db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
      },
    });

    return c.json({ data: allEmployees });
  });

export default app;
