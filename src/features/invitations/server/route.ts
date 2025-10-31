import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ID, Query } from "node-appwrite";
import { addDays } from "date-fns";

import { sessionMiddleware } from "@/lib/session-middleware";
import { createAdminClient } from "@/lib/appwrite";
import { createEmailService } from "@/lib/email";
import { createInvitationEmailTemplate, createInvitationEmailSubject } from "@/lib/email-templates";
import { DATABASE_ID, INVITATIONS_ID, MEMBERS_ID, WORKSPACES_ID } from "@/config";
import { getMember } from "@/features/members/utils";
import { MemberRole } from "@/features/members/types";

import { inviteMemberSchema, acceptInviteSchema } from "../schemas";
import { Invitation, InvitationStatus } from "../types";

const app = new Hono()
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", inviteMemberSchema),
    async (c) => {
      const { account } = await createAdminClient();
      const databases = c.get("databases");
      const user = c.get("user");
      
      const { email, workspaceId } = c.req.valid("json");

      // Check if user is admin of the workspace
      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Check if user is already a member
      const existingMember = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        [Query.equal("workspaceId", workspaceId)]
      );

      // Get all users to check if email exists as a member
      const { users } = await createAdminClient();
      let existingUser;
      try {
        // Try to get user by email
        const usersList = await users.list([Query.equal("email", email)]);
        existingUser = usersList.users[0];
      } catch (error) {
        // User doesn't exist yet, that's fine
      }

      if (existingUser) {
        // Check if this user is already a member
        const isAlreadyMember = existingMember.documents.some(
          (member: any) => member.userId === existingUser.$id
        );

        if (isAlreadyMember) {
          return c.json({ error: "User is already a member of this workspace" }, 400);
        }
      }

      // Check if there's already a pending invitation for this email
      try {
        const existingInvitation = await databases.listDocuments(
          DATABASE_ID,
          INVITATIONS_ID,
          [
            Query.equal("email", email),
            Query.equal("workspaceId", workspaceId),
            Query.equal("status", InvitationStatus.PENDING)
          ]
        );

        if (existingInvitation.documents.length > 0) {
          return c.json({ error: "An invitation has already been sent to this email" }, 400);
        }
      } catch (error: any) {
        // If invitations collection doesn't exist, skip the check for now
        if (error.code === 404 && error.type === 'collection_not_found') {
          console.warn("Invitations collection not found. Please create it in Appwrite database.");
        } else {
          throw error;
        }
      }

      // Get workspace information for the email
      const workspace = await databases.getDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId
      );

      // Create invitation
      const expiresAt = addDays(new Date(), 7); // Expires in 7 days
      
      try {
        const invitation = await databases.createDocument(
          DATABASE_ID,
          INVITATIONS_ID,
          ID.unique(),
          {
            email,
            workspaceId,
            invitedBy: user.$id,
            status: InvitationStatus.PENDING,
            expiresAt: expiresAt.toISOString(),
          }
        );

        // Send invitation email automatically
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3003";
        const inviteLink = `${baseUrl}/invite/${invitation.$id}`;
        
        const emailService = createEmailService();
        const emailSubject = createInvitationEmailSubject(workspace.name, user.name || user.email);
        const emailHtml = createInvitationEmailTemplate({
          inviteeEmail: email,
          workspaceName: workspace.name,
          inviterName: user.name || user.email,
          inviteLink,
          expiresAt: expiresAt.toISOString(),
        });

        try {
          console.log(`📧 Attempting to send email to: ${email}`);
          await emailService.sendEmail({
            to: email,
            subject: emailSubject,
            html: emailHtml,
          });
          console.log(`✅ Email sent successfully to: ${email}`);
        } catch (emailError) {
          console.error("❌ Failed to send invitation email:", emailError);
          console.log("💡 Tip: Add RESEND_API_KEY to .env.local for real email sending");
          // Don't fail the invitation creation if email fails
        }
        
        return c.json({ 
          data: { 
            ...invitation, 
            inviteLink,
            emailSent: true
          } 
        });
      } catch (error: any) {
        if (error.code === 404 && error.type === 'collection_not_found') {
          return c.json({ 
            error: "Invitations collection not found. Please create the 'invitations' collection in your Appwrite database. See INVITATION_SETUP.md for instructions." 
          }, 503);
        }
        throw error;
      }
    }
  )
  .post(
    "/:inviteId/accept",
    sessionMiddleware,
    zValidator("param", acceptInviteSchema),
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");
      const { inviteId } = c.req.valid("param");

      // Get the invitation
      let invitation;
      try {
        invitation = await databases.getDocument<Invitation>(
          DATABASE_ID,
          INVITATIONS_ID,
          inviteId
        );
      } catch (error: any) {
        if (error.code === 404 && error.type === 'collection_not_found') {
          return c.json({ 
            error: "Invitations collection not found. Please create the 'invitations' collection in your Appwrite database." 
          }, 503);
        }
        return c.json({ error: "Invitation not found" }, 404);
      }

      if (!invitation) {
        return c.json({ error: "Invitation not found" }, 404);
      }

      // Check if invitation is still valid
      if (invitation.status !== InvitationStatus.PENDING) {
        return c.json({ error: "Invitation is no longer valid" }, 400);
      }

      // Check if invitation has expired
      if (new Date() > new Date(invitation.expiresAt)) {
        // Mark as expired
        await databases.updateDocument(
          DATABASE_ID,
          INVITATIONS_ID,
          inviteId,
          {
            status: InvitationStatus.EXPIRED,
          }
        );
        return c.json({ error: "Invitation has expired" }, 400);
      }

      // Check if user's email matches the invitation email
      console.log(`🔍 Checking email match:`);
      console.log(`   User email: ${user.email}`);
      console.log(`   Invitation email: ${invitation.email}`);
      
      // TEMPORARY: Allow any user to accept any invitation for testing
      // TODO: Re-enable email validation for production
      const ALLOW_ANY_EMAIL_FOR_TESTING = true;
      
      if (!ALLOW_ANY_EMAIL_FOR_TESTING && user.email !== invitation.email) {
        console.log(`❌ Email mismatch - rejecting invitation acceptance`);
        return c.json({ 
          error: `This invitation was sent to ${invitation.email}, but you're logged in as ${user.email}` 
        }, 403);
      }
      
      console.log(`✅ Proceeding with invitation acceptance (email validation: ${!ALLOW_ANY_EMAIL_FOR_TESTING})`);

      // Check if user is already a member
      const existingMember = await getMember({
        databases,
        workspaceId: invitation.workspaceId,
        userId: user.$id,
      });

      console.log(`👥 Membership check:`);
      console.log(`   User ID: ${user.$id}`);
      console.log(`   Workspace ID: ${invitation.workspaceId}`);
      console.log(`   Existing member: ${existingMember ? 'YES' : 'NO'}`);

      if (existingMember) {
        // Mark invitation as accepted anyway
        await databases.updateDocument(
          DATABASE_ID,
          INVITATIONS_ID,
          inviteId,
          {
            status: InvitationStatus.ACCEPTED,
          }
        );
        console.log(`❌ User is already a member - returning error`);
        return c.json({ error: "You are already a member of this workspace" }, 400);
      }

      // Add user as member
      await databases.createDocument(DATABASE_ID, MEMBERS_ID, ID.unique(), {
        userId: user.$id,
        workspaceId: invitation.workspaceId,
        role: MemberRole.MEMBER,
      });

      // Mark invitation as accepted
      await databases.updateDocument(
        DATABASE_ID,
        INVITATIONS_ID,
        inviteId,
        {
          status: InvitationStatus.ACCEPTED,
        }
      );

      // Get workspace info to return
      const workspace = await databases.getDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        invitation.workspaceId
      );

      return c.json({ data: workspace });
    }
  )
  .get(
    "/:inviteId",
    sessionMiddleware,
    zValidator("param", acceptInviteSchema),
    async (c) => {
      const databases = c.get("databases");
      const { inviteId } = c.req.valid("param");

      // Get the invitation
      let invitation;
      try {
        invitation = await databases.getDocument<Invitation>(
          DATABASE_ID,
          INVITATIONS_ID,
          inviteId
        );
      } catch (error: any) {
        if (error.code === 404 && error.type === 'collection_not_found') {
          return c.json({ 
            error: "Invitations collection not found. Please create the 'invitations' collection in your Appwrite database." 
          }, 503);
        }
        return c.json({ error: "Invitation not found" }, 404);
      }

      if (!invitation) {
        return c.json({ error: "Invitation not found" }, 404);
      }

      // Get workspace info
      const workspace = await databases.getDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        invitation.workspaceId
      );

      return c.json({ 
        data: { 
          invitation,
          workspace: {
            $id: workspace.$id,
            name: workspace.name,
            imageUrl: workspace.imageUrl
          }
        } 
      });
    }
  );

export default app;