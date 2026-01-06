import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@/db";
import { clientInvitations, members, projects, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { sessionMiddleware } from "@/lib/session-middleware";
import { createEmailService } from "@/lib/email";
import { createClientInvitationEmailTemplate, createClientInvitationEmailSubject } from "@/lib/email-templates";

const app = new Hono()
  // Send client invitation
  .post(
    "/invite",
    sessionMiddleware,
    zValidator("json", z.object({
      email: z.string().email(),
      projectId: z.string(),
      workspaceId: z.string(),
    }), (result, c) => {
      if (!result.success) {
        console.log("Validation error:", result.error);
        return c.json({ error: "Invalid request data", details: result.error.issues }, 400);
      }
    }),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { email, projectId, workspaceId: clientWorkspaceId } = c.req.valid("json");

      console.log("Client invitation request:", { email, projectId, workspaceId: clientWorkspaceId, userId: user.id });

      try {
        // First, get the project to find the correct workspace
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId));

        if (!project) {
          return c.json({ error: "Project not found" }, 404);
        }

        console.log("Project found:", { projectId: project.id, projectWorkspaceId: project.workspaceId });

        // Find the actual workspace for this user and project
        // If project has workspaceId, use it; otherwise find from user's memberships
        let actualWorkspaceId: string | null = project.workspaceId;
        
        if (!actualWorkspaceId) {
          // Project doesn't have workspace set, find user's workspace
          const userMemberships = await db
            .select()
            .from(members)
            .where(eq(members.userId, user.id));
          
          console.log("User memberships:", userMemberships.length);
          
          if (userMemberships.length > 0) {
            actualWorkspaceId = userMemberships[0].workspaceId;
            console.log("Using user's workspace:", actualWorkspaceId);
          } else {
            return c.json({ error: "No workspace found for user" }, 403);
          }
        }

        // Check if user is admin/project manager in the actual workspace
        const [member] = await db
          .select()
          .from(members)
          .where(
            and(
              eq(members.userId, user.id),
              eq(members.workspaceId, actualWorkspaceId)
            )
          );

        console.log("Member check:", member);

        if (!member || !["ADMIN", "PROJECT_MANAGER"].includes(member.role)) {
          console.log("Permission denied:", member?.role);
          return c.json({ error: "Only admins and project managers can invite clients" }, 403);
        }

        console.log("Permission granted:", member.role);

        // Check if email is already an internal user
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email));

        console.log("Existing user check:", existingUser?.id);

        if (existingUser) {
          const [existingMember] = await db
            .select()
            .from(members)
            .where(
              and(
                eq(members.userId, existingUser.id),
                eq(members.workspaceId, actualWorkspaceId)
              )
            );

          console.log("Existing member check:", existingMember?.role);

          if (existingMember && existingMember.role !== "CLIENT") {
            return c.json({ error: "This email is already an internal employee" }, 400);
          }
        }

        // Check for existing pending invitations
        const [existingInvitation] = await db
          .select()
          .from(clientInvitations)
          .where(
            and(
              eq(clientInvitations.email, email),
              eq(clientInvitations.projectId, projectId),
              eq(clientInvitations.status, "pending")
            )
          );

        console.log("Existing invitation check:", existingInvitation?.id);

        if (existingInvitation) {
          // Delete old invitation and create a new one (resend functionality)
          await db
            .delete(clientInvitations)
            .where(eq(clientInvitations.id, existingInvitation.id));
          
          console.log("Deleted old invitation, creating new one...");
        }

        // Generate secure token
        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        console.log("Creating invitation...");

        // Create invitation with the actual workspace ID
        const [invitation] = await db
          .insert(clientInvitations)
          .values({
            email,
            projectId,
            workspaceId: actualWorkspaceId,
            invitedBy: user.id,
            token,
            expiresAt,
          })
          .returning();

        console.log("Invitation created:", invitation.id);

        // Generate invitation link
        const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/client/accept?token=${token}`;
        
        console.log("Generated invite link:", inviteLink);

        // Send email notification
        let emailSent = false;
        try {
          const emailService = createEmailService();
          
          await emailService.sendEmail({
            to: email, // Send to the client's email address
            subject: createClientInvitationEmailSubject(project.name),
            html: createClientInvitationEmailTemplate({
              clientEmail: email,
              projectName: project.name,
              inviterName: user.name || user.email,
              inviteLink,
              expiresAt: expiresAt.toISOString(),
            }),
            from: process.env.EMAIL_FROM || 'PMS Team <noreply@yourdomain.com>',
          });
          
          emailSent = true;
          console.log(`✅ Invitation email sent to ${email}`);
        } catch (emailError) {
          // Log error but don't fail the invitation creation
          console.error("⚠️ Failed to send invitation email:", emailError);
          console.log("Invitation link (copy manually):", inviteLink);
        }

        return c.json({
          data: {
            id: invitation.id,
            email: invitation.email,
            token: token, // Always return token for manual link generation
            inviteLink,
            emailSent,
            expiresAt: invitation.expiresAt,
          },
        });
      } catch (error) {
        console.error("Error creating client invitation:", error);
        return c.json({ error: error instanceof Error ? error.message : "Failed to create invitation" }, 400);
      }
    }
  )

  // Get all invitations for a project
  .get(
    "/project/:projectId",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");

      const projectId = c.req.param("projectId");

      // Check if user has access to this project
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId));

      if (!project) {
        return c.json({ error: "Project not found" }, 404);
      }

      const invitations = await db
        .select({
          id: clientInvitations.id,
          email: clientInvitations.email,
          status: clientInvitations.status,
          expiresAt: clientInvitations.expiresAt,
          acceptedAt: clientInvitations.acceptedAt,
          createdAt: clientInvitations.createdAt,
          invitedBy: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(clientInvitations)
        .leftJoin(users, eq(clientInvitations.invitedBy, users.id))
        .where(eq(clientInvitations.projectId, projectId));

      return c.json({ data: invitations });
    }
  )

  // Verify invitation token
  .get(
    "/verify/:token",
    async (c) => {
      const token = c.req.param("token");

      const [invitation] = await db
        .select({
          id: clientInvitations.id,
          email: clientInvitations.email,
          projectId: clientInvitations.projectId,
          workspaceId: clientInvitations.workspaceId,
          status: clientInvitations.status,
          expiresAt: clientInvitations.expiresAt,
          project: {
            id: projects.id,
            name: projects.name,
            imageUrl: projects.imageUrl,
          },
        })
        .from(clientInvitations)
        .leftJoin(projects, eq(clientInvitations.projectId, projects.id))
        .where(eq(clientInvitations.token, token));

      if (!invitation) {
        return c.json({ error: "Invalid invitation" }, 404);
      }

      if (invitation.status !== "pending") {
        return c.json({ error: "Invitation already used" }, 400);
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        return c.json({ error: "Invitation expired" }, 400);
      }

      return c.json({ data: invitation });
    }
  )

  // Accept invitation and create client account
  .post(
    "/accept",
    zValidator("json", z.object({
      token: z.string(),
      name: z.string().min(1),
      password: z.string().min(6),
    })),
    async (c) => {
      const { token, name, password } = c.req.valid("json");

      // Verify invitation
      const [invitation] = await db
        .select()
        .from(clientInvitations)
        .where(eq(clientInvitations.token, token));

      if (!invitation) {
        return c.json({ error: "Invalid invitation" }, 404);
      }

      if (invitation.status !== "pending") {
        return c.json({ error: "Invitation already used" }, 400);
      }

      if (new Date() > new Date(invitation.expiresAt)) {
        return c.json({ error: "Invitation expired" }, 400);
      }

      // Check if user already exists
      let userId: string;
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, invitation.email));

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user
        const bcrypt = require("bcryptjs");
        const hashedPassword = await bcrypt.hash(password, 10);

        const [newUser] = await db
          .insert(users)
          .values({
            email: invitation.email,
            name,
            password: hashedPassword,
          })
          .returning();

        userId = newUser.id;
      }

      // Create CLIENT member with project scope
      await db
        .insert(members)
        .values({
          userId,
          workspaceId: invitation.workspaceId,
          projectId: invitation.projectId,
          role: "CLIENT",
        });

      // Update invitation status
      await db
        .update(clientInvitations)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
        })
        .where(eq(clientInvitations.id, invitation.id));

      return c.json({
        message: "Invitation accepted successfully",
        data: {
          userId,
          projectId: invitation.projectId,
        },
      });
    }
  )

  // Revoke invitation
  .delete(
    "/:invitationId",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");

      const invitationId = c.req.param("invitationId");

      // Check if user is admin/project manager
      const [invitation] = await db
        .select()
        .from(clientInvitations)
        .where(eq(clientInvitations.id, invitationId));

      if (!invitation) {
        return c.json({ error: "Invitation not found" }, 404);
      }

      const [member] = await db
        .select()
        .from(members)
        .where(
          and(
            eq(members.userId, user.id),
            eq(members.workspaceId, invitation.workspaceId)
          )
        );

      if (!member || !["ADMIN", "PROJECT_MANAGER"].includes(member.role)) {
        return c.json({ error: "Only admins and project managers can revoke invitations" }, 403);
      }

      // Update invitation status
      await db
        .update(clientInvitations)
        .set({
          status: "revoked",
        })
        .where(eq(clientInvitations.id, invitationId));

      return c.json({ message: "Invitation revoked successfully" });
    }
  );

export default app;
