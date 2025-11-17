import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { projectRequirements, users } from "@/db/schema";
import { sessionMiddleware } from "@/lib/session-middleware";
import { eq } from "drizzle-orm";

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
        sampleInputFiles: z.array(z.string()).optional(),
        expectedOutputFiles: z.array(z.string()).optional(),
      })
    ),
    async (c) => {
      try {
        const data = c.req.valid("json");

        const [requirement] = await db
          .insert(projectRequirements)
          .values({
            tentativeTitle: data.tentativeTitle,
            customer: data.customer,
            projectManagerId: data.projectManagerId,
            projectDescription: data.projectDescription || null,
            sampleInputFiles: data.sampleInputFiles || [],
            expectedOutputFiles: data.expectedOutputFiles || [],
          })
          .returning();

        return c.json({ data: requirement });
      } catch (error: any) {
        console.error("Error creating requirement:", error);
        return c.json({ error: error.message || "Internal server error" }, 500);
      }
    }
  )
  .get("/", sessionMiddleware, async (c) => {
    try {
      const requirements = await db
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
        .leftJoin(users, eq(projectRequirements.projectManagerId, users.id));

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
