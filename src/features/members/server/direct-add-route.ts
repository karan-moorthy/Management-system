// Admin Direct Add Member API
// This allows admins to directly add existing users to workspace without invitation

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ID, Query } from "node-appwrite";
import { z } from "zod";

import { sessionMiddleware } from "@/lib/session-middleware";
import { createAdminClient } from "@/lib/appwrite";
import { DATABASE_ID, MEMBERS_ID } from "@/config";
import { getMember } from "@/features/members/utils";
import { MemberRole } from "@/features/members/types";

const addMemberDirectlySchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  workspaceId: z.string().min(1, "Workspace ID is required"),
  role: z.enum(["ADMIN", "MEMBER"]).optional().default("MEMBER"),
});

const app = new Hono()
  .post(
    "/direct-add",
    sessionMiddleware,
    zValidator("json", addMemberDirectlySchema),
    async (c) => {
      const { users } = await createAdminClient();
      const databases = c.get("databases");
      const currentUser = c.get("user");
      
      const { email, workspaceId, role } = c.req.valid("json");

      // Check if current user is admin of the workspace
      const member = await getMember({
        databases,
        workspaceId,
        userId: currentUser.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized - Only workspace admins can directly add members" }, 401);
      }

      try {
        // Find user by email
        const usersList = await users.list([Query.equal("email", email)]);
        
        if (usersList.users.length === 0) {
          return c.json({ 
            error: "User not found. The person must create an account first, or use the invitation system." 
          }, 404);
        }

        const targetUser = usersList.users[0];

        // Check if user is already a member
        const existingMember = await getMember({
          databases,
          workspaceId,
          userId: targetUser.$id,
        });

        if (existingMember) {
          return c.json({ error: "User is already a member of this workspace" }, 400);
        }

        // Add user as member directly
        const newMember = await databases.createDocument(
          DATABASE_ID,
          MEMBERS_ID,
          ID.unique(),
          {
            userId: targetUser.$id,
            workspaceId,
            role: role as MemberRole,
          }
        );

        return c.json({ 
          data: newMember,
          message: `Successfully added ${email} to workspace`
        });

      } catch (error) {
        console.error("Error adding member directly:", error);
        return c.json({ error: "Failed to add member" }, 500);
      }
    }
  );

export default app;