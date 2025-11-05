import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and } from "drizzle-orm";

import { sessionMiddleware } from "@/lib/session-middleware";
import { db } from "@/db";
import { members, users } from "@/db/schema";

import { getMember } from "../utils";
import { MemberRole } from "../types";

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

      if (!currentMember || currentMember.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized - Only workspace admins can directly add members" }, 401);
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
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const user = c.get("user");
      const { workspaceId } = c.req.valid("query");

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

    if (currentMember.role !== MemberRole.ADMIN) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (memberToDelete.userId === user.id) {
      return c.json({ error: "Cannot delete yourself" }, 400);
    }

    await db.delete(members).where(eq(members.id, memberId));

    return c.json({ data: { id: memberId } });
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

      if (currentMember.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
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
  );

export default app;
