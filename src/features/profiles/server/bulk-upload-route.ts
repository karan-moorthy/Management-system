import { Hono } from "hono";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { db } from "@/db";
import { users, members, workspaces } from "@/db/schema";
import { sessionMiddleware } from "@/lib/session-middleware";
import { or, eq, inArray } from "drizzle-orm";
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

const app = new Hono().post("/", sessionMiddleware, async (c) => {
  const user = c.get("user");

  // Check if user is admin
  const adminCheck = await isUserAdmin(user.id);
  if (!adminCheck) {
    return c.json({ error: "Unauthorized - Admin access required for bulk uploads" }, 403);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: "File size exceeds 10MB limit" }, 400);
    }

    // Read the file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let workbook: XLSX.WorkBook;
    
    // Parse based on file type
    if (file.name.endsWith(".csv")) {
      const csvData = buffer.toString("utf-8");
      workbook = XLSX.read(csvData, { type: "string" });
    } else {
      workbook = XLSX.read(buffer, { type: "buffer" });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return c.json({ error: "File is empty" }, 400);
    }

    if (jsonData.length > 100) {
      return c.json({ error: "Maximum 100 profiles per upload" }, 400);
    }

    const profiles = [];
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row: any = jsonData[i];
      
      // Trim all string fields to remove whitespace
      if (row.name) row.name = row.name.toString().trim();
      if (row.email) row.email = row.email.toString().trim();
      if (row.password) row.password = row.password.toString().trim();
      if (row.mobile_no) row.mobile_no = row.mobile_no.toString().trim();
      if (row.native) row.native = row.native.toString().trim();
      if (row.designation) row.designation = row.designation.toString().trim();
      if (row.department) row.department = row.department.toString().trim();
      if (row.role) row.role = row.role.toString().trim().toUpperCase();
      
      // Parse has_login_access (TRUE/FALSE, 1/0, true/false, yes/no)
      const hasLoginAccess = row.has_login_access !== undefined
        ? ['TRUE', '1', 'YES', 'Y', true, 1].includes(String(row.has_login_access).toUpperCase())
        : true; // Default to true for backwards compatibility
      
      // Basic required fields
      if (!row.name || !row.email) {
        const missing = [];
        if (!row.name) missing.push('name');
        if (!row.email) missing.push('email');
        errors.push(`Row ${i + 2}: Missing required fields: ${missing.join(', ')}`);
        continue;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        errors.push(`Row ${i + 2}: Invalid email format: "${row.email}" (length: ${row.email.length})`);
        continue;
      }

      // If login access is enabled, validate password and role
      if (hasLoginAccess) {
        if (!row.password) {
          errors.push(`Row ${i + 2}: Password required when has_login_access is TRUE`);
          continue;
        }
        if (row.password.length < 6) {
          errors.push(`Row ${i + 2}: Password must be at least 6 characters (current length: ${row.password.length})`);
          continue;
        }
        if (!row.role) {
          errors.push(`Row ${i + 2}: Role required when has_login_access is TRUE (ADMIN, PROJECT_MANAGER, TEAM_LEAD, EMPLOYEE, MANAGEMENT)`);
          continue;
        }
        // Validate role
        const validRoles = [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER, MemberRole.TEAM_LEAD, MemberRole.EMPLOYEE, MemberRole.MANAGEMENT];
        if (!validRoles.includes(row.role as MemberRole)) {
          errors.push(`Row ${i + 2}: Invalid role "${row.role}". Must be one of: ${validRoles.join(', ')}`);
          continue;
        }
      }

      try {
        // Hash password only if login access is enabled
        const hashedPassword = hasLoginAccess && row.password 
          ? await bcrypt.hash(row.password, 10) 
          : null;

        // Parse skills if present
        let skills = null;
        if (row.skills && typeof row.skills === "string") {
          const skillsArray = row.skills.split(",").map((s: string) => s.trim()).filter(Boolean);
          if (skillsArray.length > 0) {
            skills = skillsArray;
          }
        }

        // Parse dates
        let dateOfBirth = null;
        if (row.date_of_birth) {
          const dob = new Date(row.date_of_birth);
          if (!isNaN(dob.getTime())) {
            dateOfBirth = dob;
          }
        }

        let dateOfJoining = null;
        if (row.date_of_joining) {
          const doj = new Date(row.date_of_joining);
          if (!isNaN(doj.getTime())) {
            dateOfJoining = doj;
          }
        }

        const profileData: any = {
          name: row.name,
          email: row.email.toLowerCase(),
          password: hashedPassword,
          mobileNo: row.mobile_no || null,
          native: row.native || null,
          designation: row.designation || null,
          department: row.department || null,
          experience: row.experience ? parseInt(row.experience) : null,
          dateOfBirth,
          dateOfJoining,
        };

        // Only add skills if we have valid skills
        if (skills) {
          profileData.skills = skills;
        }

        profiles.push({
          ...profileData,
          hasLoginAccess,
          role: hasLoginAccess ? row.role : null,
        });
      } catch (error) {
        errors.push(`Row ${i + 2}: Error processing data`);
      }
    }

    if (profiles.length === 0) {
      return c.json({ error: "No valid profiles to insert", details: errors }, 400);
    }

    // Check for existing values in database
    const namesToCheck = profiles.map(p => p.name);
    const emailsToCheck = profiles.map(p => p.email);
    const mobilesToCheck = profiles.map(p => p.mobileNo).filter(Boolean);

    const existingUsers = await db
      .select({ name: users.name, email: users.email, mobileNo: users.mobileNo })
      .from(users)
      .where(
        or(
          inArray(users.name, namesToCheck),
          inArray(users.email, emailsToCheck),
          mobilesToCheck.length > 0 ? inArray(users.mobileNo, mobilesToCheck) : undefined
        )
      );

    const existingNames = new Set(existingUsers.map(u => u.name));
    const existingEmails = new Set(existingUsers.map(u => u.email));
    const existingMobiles = new Set(existingUsers.map(u => u.mobileNo).filter(Boolean));

    // Filter out profiles with existing values
    const newProfiles = profiles.filter(p => {
      const issues = [];
      
      if (existingNames.has(p.name)) {
        issues.push('name already exists');
      }
      if (existingEmails.has(p.email)) {
        issues.push('email already exists');
      }
      if (p.mobileNo && existingMobiles.has(p.mobileNo)) {
        issues.push('mobile number already exists');
      }
      
      if (issues.length > 0) {
        errors.push(`User "${p.name}" (${p.email}): ${issues.join(', ')}`);
        return false;
      }
      return true;
    });

    if (newProfiles.length === 0) {
      return c.json({
        error: "All profiles already exist or have conflicts",
        details: errors,
        skipped: profiles.length
      }, 409);
    }

    // Insert profiles in batch
    try {
      // Separate profiles data (without hasLoginAccess/role) for users table
      const userProfiles = newProfiles.map(p => {
        const { hasLoginAccess, role, ...userData } = p;
        return userData;
      });

      const insertedProfiles = await db.insert(users).values(userProfiles).returning();

      // Create memberships for users with login access
      const [workspace] = await db.select().from(workspaces).limit(1);
      if (workspace) {
        const membershipsToCreate = [];
        
        for (let i = 0; i < insertedProfiles.length; i++) {
          const profile = newProfiles[i];
          const insertedUser = insertedProfiles[i];
          
          if (profile.hasLoginAccess && profile.role) {
            membershipsToCreate.push({
              userId: insertedUser.id,
              workspaceId: workspace.id,
              role: profile.role,
            });
          }
        }

        if (membershipsToCreate.length > 0) {
          await db.insert(members).values(membershipsToCreate);
        }
      }

      return c.json({
        success: true,
        count: insertedProfiles.length,
        skipped: profiles.length - newProfiles.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      if (error.code === "23505") {
        // Extract which constraint failed
        const constraintName = error.cause?.constraint_name || '';
        let message = "Duplicate value found";
        if (constraintName.includes('email')) message = "Duplicate email address";
        else if (constraintName.includes('name')) message = "Duplicate name";
        else if (constraintName.includes('mobile')) message = "Duplicate mobile number";
        
        return c.json({ error: message, details: errors }, 409);
      }
      throw error;
    }
  } catch (error) {
    console.error("[Bulk Upload] Fatal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return c.json({ 
      error: "Failed to process file",
      details: errorMessage,
      success: false
    }, 500);
  }
});

export default app;
