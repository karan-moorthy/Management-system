import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  workspaceId: z.string().min(1, "Workspace ID is required"),
});

export const acceptInviteSchema = z.object({
  inviteId: z.string().min(1, "Invite ID is required"),
});