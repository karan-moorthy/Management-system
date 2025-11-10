/**
 * React hook for checking permissions in UI components
 */
"use client";

import { useMemo } from "react";
import { 
  Permission, 
  UserRole, 
  canPerformAction, 
  hasPermission,
  type PermissionContext 
} from "@/lib/permissions";

interface UsePermissionsProps {
  role: UserRole;
  userId: string;
  projectId?: string;
  userProjects?: string[];
  teamMemberIds?: string[];
}

export function usePermissions({
  role,
  userId,
  projectId,
  userProjects,
  teamMemberIds,
}: UsePermissionsProps) {
  const context = useMemo<PermissionContext>(
    () => ({
      role,
      userId,
      projectId,
      userProjects,
      teamMemberIds,
    }),
    [role, userId, projectId, userProjects, teamMemberIds]
  );

  const can = useMemo(
    () => ({
      // Project permissions
      createProject: hasPermission(role, Permission.CREATE_PROJECT),
      editProject: hasPermission(role, Permission.EDIT_PROJECT),
      deleteProject: hasPermission(role, Permission.DELETE_PROJECT),
      viewProject: hasPermission(role, Permission.VIEW_PROJECT),

      // Task permissions
      createTask: (projectId?: string) =>
        canPerformAction(Permission.CREATE_TASK, {
          ...context,
          projectId: projectId || context.projectId,
        }),
      editTask: (taskOwnerId: string) =>
        canPerformAction(Permission.EDIT_TASK, { ...context, taskOwnerId }),
      deleteTask: hasPermission(role, Permission.DELETE_TASK),
      viewAllTasks: hasPermission(role, Permission.VIEW_ALL_TASKS),
      assignTask: canPerformAction(Permission.ASSIGN_TASK, context),
      changeStatus: (taskOwnerId?: string) =>
        canPerformAction(Permission.CHANGE_STATUS, { ...context, taskOwnerId }),

      // User permissions
      manageUsers: canPerformAction(Permission.MANAGE_USERS, context),

      // Other permissions
      comment: hasPermission(role, Permission.COMMENT),
      accessDashboard: hasPermission(role, Permission.DASHBOARD_ACCESS),
    }),
    [role, context]
  );

  return {
    can,
    role,
    isAdmin: role === UserRole.ADMIN,
    isProjectManager: role === UserRole.PROJECT_MANAGER,
    isTeamLead: role === UserRole.TEAM_LEAD,
    isEmployee: role === UserRole.EMPLOYEE,
    isManagement: role === UserRole.MANAGEMENT,
  };
}
