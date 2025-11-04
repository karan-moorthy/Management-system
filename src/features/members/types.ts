export enum MemberRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export type Member = {
  id: string;
  workspaceId: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
  updatedAt: string;
  name: string;
  email: string;
};
