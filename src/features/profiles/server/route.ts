import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, customDesignations, customDepartments } from "@/db/schema";
import { sessionMiddleware } from "@/lib/session-middleware";
import { eq } from "drizzle-orm";

const app = new Hono()
  .post(
    "/",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        mobileNo: z.string().optional(),
        native: z.string().optional(),
        designation: z.string().optional(),
        department: z.string().optional(),
        experience: z.number().optional(),
        dateOfBirth: z.string().optional(),
        dateOfJoining: z.string().optional(),
        skills: z.array(z.string()).optional(),
      })
    ),
    async (c) => {
      const user = c.get("user");

      try {
        const data = c.req.valid("json");

        // Hash the password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Prepare insert values - only include skills if provided
        const insertValues: any = {
          name: data.name,
          email: data.email.toLowerCase(),
          password: hashedPassword,
          mobileNo: data.mobileNo || null,
          native: data.native || null,
          designation: data.designation || null,
          department: data.department || null,
          experience: data.experience || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          dateOfJoining: data.dateOfJoining ? new Date(data.dateOfJoining) : null,
        };

        // Only add skills if provided and not empty
        if (data.skills && data.skills.length > 0) {
          insertValues.skills = data.skills;
        }

        // Insert the new user
        const [newUser] = await db
          .insert(users)
          .values(insertValues)
          .returning();

        return c.json({ data: newUser });
      } catch (error: any) {
        if (error.code === "23505") {
          // Unique constraint violation
          return c.json({ error: "Email already exists" }, 409);
        }
        console.error("Error creating profile:", error);
        return c.json({ error: error.message || "Internal server error" }, 500);
      }
    }
  )
  .get("/", sessionMiddleware, async (c) => {
    try {
      const allProfiles = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          mobileNo: users.mobileNo,
          native: users.native,
          designation: users.designation,
          department: users.department,
          experience: users.experience,
          dateOfBirth: users.dateOfBirth,
          dateOfJoining: users.dateOfJoining,
          skills: users.skills,
        })
        .from(users);

      return c.json({ data: allProfiles });
    } catch (error: any) {
      console.error("Error fetching profiles:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  })
  .get("/designations", async (c) => {
    try {
      const designations = await db
        .select()
        .from(customDesignations)
        .orderBy(customDesignations.name);

      return c.json({ data: designations });
    } catch (error) {
      console.error("Error fetching designations:", error);
      return c.json({ error: "Failed to fetch designations" }, 500);
    }
  })
  .post(
    "/designations",
    sessionMiddleware,
    zValidator("json", z.object({
      name: z.string().min(2, "Designation name must be at least 2 characters"),
    })),
    async (c) => {
      try {
        const { name } = c.req.valid("json");

        const [designation] = await db
          .insert(customDesignations)
          .values({ name })
          .returning();

        return c.json({ data: designation });
      } catch (error: any) {
        // Check for duplicate key error (PostgreSQL error code 23505)
        if (error.cause?.code === '23505' || error.code === '23505') {
          return c.json({ error: "This designation already exists" }, 409);
        }
        
        return c.json({ error: error.message || "Failed to create designation" }, 500);
      }
    }
  )
  .get("/departments", async (c) => {
    try {
      const departments = await db
        .select()
        .from(customDepartments)
        .orderBy(customDepartments.name);

      return c.json({ data: departments });
    } catch (error) {
      console.error("Error fetching departments:", error);
      return c.json({ error: "Failed to fetch departments" }, 500);
    }
  })
  .post(
    "/departments",
    sessionMiddleware,
    zValidator("json", z.object({
      name: z.string().min(2, "Department name must be at least 2 characters"),
    })),
    async (c) => {
      try {
        const { name } = c.req.valid("json");

        const [department] = await db
          .insert(customDepartments)
          .values({ name })
          .returning();

        return c.json({ data: department });
      } catch (error: any) {
        // Check for duplicate key error (PostgreSQL error code 23505)
        if (error.cause?.code === '23505' || error.code === '23505') {
          return c.json({ error: "This department already exists" }, 409);
        }
        
        return c.json({ error: error.message || "Failed to create department" }, 500);
      }
    }
  )
  .get("/:userId", sessionMiddleware, async (c) => {
    try {
      const userId = c.req.param("userId");

      const [profile] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          mobileNo: users.mobileNo,
          native: users.native,
          designation: users.designation,
          department: users.department,
          experience: users.experience,
          dateOfBirth: users.dateOfBirth,
          dateOfJoining: users.dateOfJoining,
          skills: users.skills,
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      return c.json({ data: profile });
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  })
  .patch(
    "/:userId",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        name: z.string().min(2).optional(),
        email: z.string().email().optional(),
        mobileNo: z.string().optional(),
        native: z.string().optional(),
        designation: z.string().optional(),
        department: z.string().optional(),
        experience: z.number().optional(),
        dateOfBirth: z.string().optional(),
        dateOfJoining: z.string().optional(),
        skills: z.array(z.string()).optional(),
      })
    ),
    async (c) => {
      try {
        const userId = c.req.param("userId");
        const data = c.req.valid("json");

        // Prepare update values
        const updateValues: any = {};

        if (data.name) updateValues.name = data.name;
        if (data.email) updateValues.email = data.email.toLowerCase();
        if (data.mobileNo !== undefined) updateValues.mobileNo = data.mobileNo || null;
        if (data.native !== undefined) updateValues.native = data.native || null;
        if (data.designation !== undefined) updateValues.designation = data.designation || null;
        if (data.department !== undefined) updateValues.department = data.department || null;
        if (data.experience !== undefined) updateValues.experience = data.experience || null;
        if (data.dateOfBirth !== undefined)
          updateValues.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
        if (data.dateOfJoining !== undefined)
          updateValues.dateOfJoining = data.dateOfJoining ? new Date(data.dateOfJoining) : null;
        if (data.skills !== undefined) {
          updateValues.skills = data.skills.length > 0 ? data.skills : null;
        }

        const [updatedUser] = await db
          .update(users)
          .set(updateValues)
          .where(eq(users.id, userId))
          .returning();

        if (!updatedUser) {
          return c.json({ error: "Profile not found" }, 404);
        }

        return c.json({ data: updatedUser });
      } catch (error: any) {
        if (error.code === "23505") {
          return c.json({ error: "Email already exists" }, 409);
        }
        console.error("Error updating profile:", error);
        return c.json({ error: error.message || "Internal server error" }, 500);
      }
    }
  )
  .delete("/:userId", sessionMiddleware, async (c) => {
    try {
      const userId = c.req.param("userId");

      const [deletedUser] = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning();

      if (!deletedUser) {
        return c.json({ error: "Profile not found" }, 404);
      }

      return c.json({ success: true, data: deletedUser });
    } catch (error: any) {
      console.error("Error deleting profile:", error);
      return c.json({ error: error.message || "Internal server error" }, 500);
    }
  });

export default app;
