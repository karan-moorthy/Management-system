/**
 * API Route Protection Middleware
 * Checks authentication and authorization
 */
import { getCurrent } from "@/features/auth/queries";
import { getUserRole } from "@/lib/get-user-role";
import { MemberRole } from "@/features/members/types";

export async function requireAuth() {
  const user = await getCurrent();
  
  if (!user) {
    throw new Error("Unauthorized: Please log in");
  }
  
  return user;
}

export async function requireRole(
  workspaceId: string,
  allowedRoles: MemberRole[]
) {
  const user = await requireAuth();
  const role = await getUserRole(user.id, workspaceId);

  if (!allowedRoles.includes(role)) {
    throw new Error(
      `Forbidden: This action requires one of these roles: ${allowedRoles.join(", ")}`
    );
  }

  return { user, role };
}

export async function canPerformTaskAction(
  workspaceId: string,
  taskOwnerId?: string,
  action?: "edit" | "delete" | "changeStatus"
) {
  const { user, role } = await requireRole(workspaceId, [
    MemberRole.ADMIN,
    MemberRole.PROJECT_MANAGER,
    MemberRole.TEAM_LEAD,
    MemberRole.EMPLOYEE,
  ]);

  // Admin and PM can do everything
  if ([MemberRole.ADMIN, MemberRole.PROJECT_MANAGER].includes(role)) {
    return true;
  }

  // Team Lead can edit team tasks
  if (role === MemberRole.TEAM_LEAD) {
    if (action === "delete") return false;
    if (action === "changeStatus") return true;
    // TODO: Check if taskOwner is in team
    return true;
  }

  // Employee can only edit own tasks
  if (role === MemberRole.EMPLOYEE) {
    if (action === "changeStatus") return false; // Needs approval
    if (action === "delete") return false;
    return taskOwnerId === user.id;
  }

  return false;
}
