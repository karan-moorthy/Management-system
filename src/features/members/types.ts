export enum MemberRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  PROJECT_MANAGER = "PROJECT_MANAGER",
  TEAM_LEAD = "TEAM_LEAD",
  EMPLOYEE = "EMPLOYEE",
  MANAGEMENT = "MANAGEMENT",
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
