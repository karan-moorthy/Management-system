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
