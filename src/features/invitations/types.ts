import { Models } from "node-appwrite";

export type Invitation = Models.Document & {
  email: string;
  workspaceId: string;
  invitedBy: string;
  status: InvitationStatus;
  expiresAt: string;
};

export enum InvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  EXPIRED = "EXPIRED",
  DECLINED = "DECLINED",
}