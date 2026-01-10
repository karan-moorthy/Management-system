import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { projectRequirements, users, members, notifications } from "@/db/schema";
import { sessionMiddleware } from "@/lib/session-middleware";
import { eq } from "drizzle-orm";
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
  .post(
    "/",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        tentativeTitle: z.string().min(1, "Title is required"),
        customer: z.string().min(1, "Customer is required"),
        projectManagerId: z.string().uuid("Invalid project manager"),
        projectDescription: z.string().optional(),
        dueDate: z.string().optional(),
        sampleInputFiles: z.array(z.object({
          name: z.string(),
          content: z.string()
        })).optional(),
        expectedOutputFiles: z.array(z.object({
          name: z.string(),
          content: z.string()
        })).optional(),
      })
    ),
    async (c) => {
      const currentUser = c.get("user");

      // Check if user is admin
      const adminCheck = await isUserAdmin(currentUser.id);
      if (!adminCheck) {
        return c.json({ error: "Forbidden: Only admins can add requirements" }, 403);
      }

      try {
        const data = c.req.valid("json");

        const [requirement] = await db
          .insert(projectRequirements)
          .values({
            tentativeTitle: data.tentativeTitle,
            customer: data.customer,
            projectManagerId: data.projectManagerId,
            projectDescription: data.projectDescription || null,
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            sampleInputFiles: data.sampleInputFiles || [],
            expectedOutputFiles: data.expectedOutputFiles || [],
            status: 'PENDING',
          } as any)
          .returning();

        // Create notification for the assigned Project Manager
        await db.insert(notifications).values({
          userId: data.projectManagerId,
          title: "New Requirement Assigned",
          message: `You have been assigned a new requirement: "${data.tentativeTitle}" from ${data.customer}`,
          type: "REQUIREMENT_ASSIGNED",
        });

        return c.json({ data: requirement });
      } catch (error: any) {
        console.error("Error creating requirement:", error);
        return c.json({ error: error.message || "Internal server error" }, 500);
      }
    }
  )
  .get("/", sessionMiddleware, async (c) => {
    try {
      const currentUser = c.get("user");

      // Get user's role
      const userMembership = await db
        .select({ role: members.role })
        .from(members)
        .where(eq(members.userId, currentUser.id))
        .limit(1);

      const userRole = userMembership.length > 0 ? userMembership[0].role : null;

      // Filter requirements based on user role
      // Admins and Management see all requirements
      // PMs see only requirements assigned to them
      // Employees and Team Leads see all requirements (read-only)
      let whereCondition;
      
      if (userRole === MemberRole.ADMIN || userRole === MemberRole.MANAGEMENT) {
        // Admins and Management see everything
        whereCondition = undefined;
      } else if (userRole === MemberRole.PROJECT_MANAGER) {
        // PMs see only their assigned requirements
        whereCondition = eq(projectRequirements.projectManagerId, currentUser.id);
      } else {
        // Employees and Team Leads see all requirements (read-only access)
        whereCondition = undefined;
      }

      const requirements = await db
        .select({
          id: projectRequirements.id,
          tentativeTitle: projectRequirements.tentativeTitle,
          customer: projectRequirements.customer,
          projectManagerId: projectRequirements.projectManagerId,
          projectDescription: projectRequirements.projectDescription,
          dueDate: projectRequirements.dueDate,
          sampleInputFiles: projectRequirements.sampleInputFiles,
          expectedOutputFiles: projectRequirements.expectedOutputFiles,
          status: projectRequirements.status,
          createdAt: projectRequirements.createdAt,
          updatedAt: projectRequirements.updatedAt,
          projectManagerName: users.name,
        })
        .from(projectRequirements)
        .leftJoin(users, eq(projectRequirements.projectManagerId, users.id))
        .where(whereCondition);

      return c.json({ data: requirements });
    } catch (error: any) {
      console.error("Error fetching requirements:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  })
  .get("/:id", sessionMiddleware, async (c) => {
    try {
      const id = c.req.param("id");

      const [requirement] = await db
        .select({
          id: projectRequirements.id,
          tentativeTitle: projectRequirements.tentativeTitle,
          customer: projectRequirements.customer,
          projectManagerId: projectRequirements.projectManagerId,
          projectDescription: projectRequirements.projectDescription,
          sampleInputFiles: projectRequirements.sampleInputFiles,
          expectedOutputFiles: projectRequirements.expectedOutputFiles,
          status: projectRequirements.status,
          createdAt: projectRequirements.createdAt,
          updatedAt: projectRequirements.updatedAt,
          projectManagerName: users.name,
        })
        .from(projectRequirements)
        .leftJoin(users, eq(projectRequirements.projectManagerId, users.id))
        .where(eq(projectRequirements.id, id));

      if (!requirement) {
        return c.json({ error: "Requirement not found" }, 404);
      }

      return c.json({ data: requirement });
    } catch (error: any) {
      console.error("Error fetching requirement:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });

export default app;
