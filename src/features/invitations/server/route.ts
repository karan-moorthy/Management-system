import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { addDays } from "date-fns";
import { eq, and } from "drizzle-orm";

import { sessionMiddleware } from "@/lib/session-middleware";
import { db } from "@/db";
import { invitations, members, users, workspaces } from "@/db/schema";
import { createEmailService } from "@/lib/email";
import { createInvitationEmailTemplate, createInvitationEmailSubject } from "@/lib/email-templates";
import { getMember } from "@/features/members/utils";
import { MemberRole } from "@/features/members/types";

import { inviteMemberSchema, acceptInviteSchema } from "../schemas";
import { InvitationStatus } from "../types";

const app = new Hono()
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", inviteMemberSchema),
    async (c) => {
      const user = c.get("user");
      const { email, workspaceId } = c.req.valid("json");

      // Check if user is admin of the workspace
      const member = await getMember({
        workspaceId,
        userId: user.id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Check if user with this email exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        // Check if this user is already a member
        const [existingMember] = await db
          .select()
          .from(members)
          .where(
            and(
              eq(members.workspaceId, workspaceId),
              eq(members.userId, existingUser.id)
            )
          )
          .limit(1);

        if (existingMember) {
          return c.json({ error: "User is already a member of this workspace" }, 400);
        }
      }

      // Check if there's already a pending invitation
      const [existingInvitation] = await db
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.email, email),
            eq(invitations.workspaceId, workspaceId),
            eq(invitations.status, InvitationStatus.PENDING)
          )
        )
        .limit(1);

      if (existingInvitation) {
        return c.json({ error: "An invitation has already been sent to this email" }, 400);
      }

      // Get workspace information
      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      // Create invitation
      const expiresAt = addDays(new Date(), 7); // Invitation expires in 7 days

      const [invitation] = await db
        .insert(invitations)
        .values({
          email,
          workspaceId,
          invitedBy: user.id,
          status: InvitationStatus.PENDING,
          expiresAt,
        })
        .returning();

      // Send invitation email
      try {
        const emailService = createEmailService();
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.id}`;
        
        await emailService.sendEmail({
          to: email,
          subject: createInvitationEmailSubject(workspace.name, user.name),
          html: createInvitationEmailTemplate({
            workspaceName: workspace.name,
            inviterName: user.name,
            inviteeEmail: email,
            inviteLink,
            expiresAt: expiresAt.toLocaleDateString(),
          }),
        });
      } catch (error) {
        console.error("Failed to send invitation email:", error);
        // Don't fail the request if email fails
      }

      return c.json({ data: invitation });
    }
  )
  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const user = c.get("user");
      const { workspaceId } = c.req.valid("query");

      // Check if user is admin
      const member = await getMember({
        workspaceId,
        userId: user.id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const invitationsList = await db
        .select()
        .from(invitations)
        .where(eq(invitations.workspaceId, workspaceId));

      return c.json({
        data: {
          documents: invitationsList,
          total: invitationsList.length,
        },
      });
    }
  )
  .get("/:invitationId", async (c) => {
    const { invitationId } = c.req.param();

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (!invitation) {
      return c.json({ error: "Invitation not found" }, 404);
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      return c.json({ error: "Invitation has expired" }, 400);
    }

    // Check if already accepted
    if (invitation.status !== InvitationStatus.PENDING) {
      return c.json({ error: "Invitation has already been used" }, 400);
    }

    // Get workspace info
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, invitation.workspaceId))
      .limit(1);

    return c.json({
      data: {
        ...invitation,
        workspace,
      },
    });
  })
  .post(
    "/:invitationId/accept",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const { invitationId } = c.req.param();

      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, invitationId))
        .limit(1);

      if (!invitation) {
        return c.json({ error: "Invitation not found" }, 404);
      }

      // Check if expired
      if (invitation.expiresAt < new Date()) {
        return c.json({ error: "Invitation has expired" }, 400);
      }

      // Check if already accepted
      if (invitation.status !== InvitationStatus.PENDING) {
        return c.json({ error: "Invitation has already been used" }, 400);
      }

      // Check if email matches
      if (invitation.email !== user.email) {
        return c.json({ error: "This invitation was sent to a different email address" }, 400);
      }

      // Check if already a member
      const [existingMember] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.workspaceId, invitation.workspaceId),
            eq(members.userId, user.id)
          )
        )
        .limit(1);

      if (existingMember) {
        return c.json({ error: "You are already a member of this workspace" }, 400);
      }

      // Add user as member
      await db.insert(members).values({
        userId: user.id,
        workspaceId: invitation.workspaceId,
        role: MemberRole.MEMBER,
      });

      // Update invitation status
      await db
        .update(invitations)
        .set({
          status: InvitationStatus.ACCEPTED,
          updatedAt: new Date(),
        })
        .where(eq(invitations.id, invitationId));

      return c.json({ data: { success: true, workspaceId: invitation.workspaceId } });
    }
  )
  .delete("/:invitationId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { invitationId } = c.req.param();

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (!invitation) {
      return c.json({ error: "Invitation not found" }, 404);
    }

    // Check if user is admin
    const member = await getMember({
      workspaceId: invitation.workspaceId,
      userId: user.id,
    });

    if (!member || member.role !== MemberRole.ADMIN) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await db.delete(invitations).where(eq(invitations.id, invitationId));

    return c.json({ data: { id: invitationId } });
  });

export default app;
