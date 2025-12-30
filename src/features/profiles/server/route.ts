import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, customDesignations, customDepartments, members } from "@/db/schema";
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
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
        mobileNo: z.preprocess(val => val === '' ? undefined : val, z.string().optional()),
        native: z.preprocess(val => val === '' ? undefined : val, z.string().optional()),
        designation: z.preprocess(val => val === '' ? undefined : val, z.string().optional()),
        department: z.preprocess(val => val === '' ? undefined : val, z.string().optional()),
        experience: z.number().optional(),
        dateOfBirth: z.preprocess(val => val === '' ? undefined : val, z.string().optional()),
        dateOfJoining: z.preprocess(val => val === '' ? undefined : val, z.string().optional()),
        skills: z.array(z.string()).optional(),
      })
    ),
    async (c) => {
      const user = c.get("user");

      // Check if user is admin
      const adminCheck = await isUserAdmin(user.id);
      if (!adminCheck) {
        return c.json({ error: "Forbidden: Only admins can add profiles" }, 403);
      }

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
        await db
          .insert(users)
          .values(insertValues);

        // Fetch the created user with separate SELECT to avoid #state error
        const [newUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, insertValues.email))
          .limit(1);

        if (!newUser) {
          throw new Error("Failed to create user");
        }

        return c.json({ data: newUser });
      } catch (error: any) {
        // Drizzle wraps PostgreSQL errors in error.cause
        const pgError = error.cause || error;
        if (pgError.code === "23505") {
          // Unique constraint violation
          const constraintName = pgError.constraint_name || '';
          let errorMessage = '';
          
          if (constraintName.includes('email')) {
            errorMessage = 'This email address is already registered. Please use a different email address.';
          } else if (constraintName.includes('mobile')) {
            errorMessage = 'This mobile number is already registered. Please use a different mobile number.';
          } else if (constraintName.includes('name')) {
            errorMessage = 'This name is already taken. Please use a different name.';
          } else {
            errorMessage = 'A user with these details already exists. Please check your information and try again.';
          }
          
          return c.json({ error: errorMessage }, 409);
        }
        console.error("Error creating profile:", error);
        return c.json({ error: "Unable to create profile. Please check your information and try again." }, 500);
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
          image: users.image,
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

        await db
          .insert(customDesignations)
          .values({ name });

        // Fetch the created designation with separate SELECT to avoid #state error
        const [designation] = await db
          .select()
          .from(customDesignations)
          .where(eq(customDesignations.name, name))
          .limit(1);

        if (!designation) {
          throw new Error("Failed to create designation");
        }

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

        await db
          .insert(customDepartments)
          .values({ name });

        // Fetch the created department with separate SELECT to avoid #state error
        const [department] = await db
          .select()
          .from(customDepartments)
          .where(eq(customDepartments.name, name))
          .limit(1);

        if (!department) {
          throw new Error("Failed to create department");
        }

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
          image: users.image,
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
        mobileNo: z.preprocess(val => val === '' ? undefined : val, z.string().optional()),
        native: z.preprocess(val => val === '' ? undefined : val, z.string().optional()),
        designation: z.preprocess(val => val === '' ? undefined : val, z.string().optional()),
        department: z.preprocess(val => val === '' ? undefined : val, z.string().optional()),
        experience: z.number().optional(),
        dateOfBirth: z.preprocess(val => val === '' ? undefined : val, z.string().optional()),
        dateOfJoining: z.preprocess(val => val === '' ? undefined : val, z.string().optional()),
        skills: z.array(z.string()).optional(),
      })
    ),
    async (c) => {
      const currentUser = c.get("user");

      // Check if user is admin
      const adminCheck = await isUserAdmin(currentUser.id);
      if (!adminCheck) {
        return c.json({ error: "Forbidden: Only admins can edit profiles" }, 403);
      }

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

        // Execute update without .returning() to avoid #state error
        await db
          .update(users)
          .set(updateValues)
          .where(eq(users.id, userId));

        // Fetch updated user separately
        const [updatedUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

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
      console.log('[Delete Profile] Starting delete operation');
      
      // Validate request method
      if (c.req.method !== 'DELETE') {
        return c.json({ error: "Method not allowed" }, 405);
      }

      const currentUser = c.get("user");
      
      // Validate user session
      if (!currentUser || !currentUser.id) {
        console.error('[Delete Profile] Invalid user session');
        return c.json({ error: "Unauthorized - Invalid session" }, 401);
      }

      console.log('[Delete Profile] Current user:', currentUser.id);

      // Check if user is admin
      const adminCheck = await isUserAdmin(currentUser.id);
      if (!adminCheck) {
        console.warn('[Delete Profile] Non-admin attempted delete:', currentUser.id);
        return c.json({ error: "Forbidden: Only admins can delete profiles" }, 403);
      }

      const userId = c.req.param("userId");
      
      // Validate userId parameter
      if (!userId || userId.trim() === '') {
        return c.json({ error: "User ID is required" }, 400);
      }

      console.log('[Delete Profile] Deleting user:', userId);

      // Delete user - execute without .returning() to avoid #state error
      await db
        .delete(users)
        .where(eq(users.id, userId));

      console.log('[Delete Profile] User deleted successfully');

      return c.json({ 
        success: true, 
        message: "Profile deleted successfully",
        userId: userId
      });
    } catch (error: any) {
      console.error('[Delete Profile] Error:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return c.json({ 
        error: "Failed to delete profile",
        details: errorMessage
      }, 500);
    }
  });

export default app;
