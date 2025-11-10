/**
 * Role-Based Access Control (RBAC) System
 * Defines roles and permissions for the PMS application
 */

export enum UserRole {
  ADMIN = "ADMIN",
  PROJECT_MANAGER = "PROJECT_MANAGER",
  TEAM_LEAD = "TEAM_LEAD",
  EMPLOYEE = "EMPLOYEE",
  MANAGEMENT = "MANAGEMENT",
}

export enum Permission {
  // Project permissions
  CREATE_PROJECT = "CREATE_PROJECT",
  EDIT_PROJECT = "EDIT_PROJECT",
  DELETE_PROJECT = "DELETE_PROJECT",
  VIEW_PROJECT = "VIEW_PROJECT",

  // Task permissions
  CREATE_TASK = "CREATE_TASK",
  EDIT_TASK = "EDIT_TASK",
  DELETE_TASK = "DELETE_TASK",
  VIEW_ALL_TASKS = "VIEW_ALL_TASKS",
  ASSIGN_TASK = "ASSIGN_TASK",
  CHANGE_STATUS = "CHANGE_STATUS",
  
  // User permissions
  MANAGE_USERS = "MANAGE_USERS",
  
  // Other permissions
  COMMENT = "COMMENT",
  DASHBOARD_ACCESS = "DASHBOARD_ACCESS",
}

/**
 * Permission matrix defining what each role can do
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.CREATE_PROJECT,
    Permission.EDIT_PROJECT,
    Permission.DELETE_PROJECT,
    Permission.VIEW_PROJECT,
    Permission.CREATE_TASK,
    Permission.EDIT_TASK,
    Permission.DELETE_TASK,
    Permission.VIEW_ALL_TASKS,
    Permission.ASSIGN_TASK,
    Permission.CHANGE_STATUS,
    Permission.MANAGE_USERS,
    Permission.COMMENT,
    Permission.DASHBOARD_ACCESS,
  ],
  [UserRole.PROJECT_MANAGER]: [
    Permission.VIEW_PROJECT,
    Permission.CREATE_TASK,
    Permission.EDIT_TASK,
    Permission.DELETE_TASK,
    Permission.VIEW_ALL_TASKS,
    Permission.ASSIGN_TASK,
    Permission.CHANGE_STATUS,
    Permission.MANAGE_USERS, // Limited to own projects
    Permission.COMMENT,
    Permission.DASHBOARD_ACCESS,
  ],
  [UserRole.TEAM_LEAD]: [
    Permission.VIEW_PROJECT,
    Permission.CREATE_TASK,
    Permission.EDIT_TASK, // Team only
    Permission.VIEW_ALL_TASKS,
    Permission.ASSIGN_TASK,
    Permission.CHANGE_STATUS,
    Permission.COMMENT,
    Permission.DASHBOARD_ACCESS,
  ],
  [UserRole.EMPLOYEE]: [
    Permission.VIEW_PROJECT,
    Permission.CREATE_TASK, // Own project only
    Permission.EDIT_TASK, // Own tasks only
    Permission.VIEW_ALL_TASKS, // Own + team
    Permission.COMMENT,
    Permission.DASHBOARD_ACCESS,
  ],
  [UserRole.MANAGEMENT]: [
    Permission.DASHBOARD_ACCESS, // View only
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Check if a role can perform an action with context
 */
export interface PermissionContext {
  userId: string;
  role: UserRole;
  taskOwnerId?: string;
  projectId?: string;
  userProjects?: string[];
  teamMemberIds?: string[];
}

/**
 * Advanced permission checker with context
 */
export function canPerformAction(
  action: Permission,
  context: PermissionContext
): boolean {
  const { role, userId, taskOwnerId, projectId, userProjects, teamMemberIds } = context;

  // Basic permission check
  if (!hasPermission(role, action)) {
    return false;
  }

  // Context-specific checks
  switch (action) {
    case Permission.CREATE_TASK:
      // Employee can only create in own projects
      if (role === UserRole.EMPLOYEE) {
        return projectId ? userProjects?.includes(projectId) || false : false;
      }
      return true;

    case Permission.EDIT_TASK:
      // Employee can only edit own tasks
      if (role === UserRole.EMPLOYEE) {
        return taskOwnerId === userId;
      }
      // Team Lead can only edit team tasks
      if (role === UserRole.TEAM_LEAD) {
        return taskOwnerId ? teamMemberIds?.includes(taskOwnerId) || false : false;
      }
      return true;

    case Permission.CHANGE_STATUS:
      // Employee needs approval - cannot directly change to Done/Closed
      if (role === UserRole.EMPLOYEE) {
        return false; // Needs approval workflow
      }
      return true;

    case Permission.ASSIGN_TASK:
      // Only Admin, PM, TL can assign
      return [UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_LEAD].includes(role);

    case Permission.VIEW_ALL_TASKS:
      // All roles except Management can view tasks (with filters)
      return role !== UserRole.MANAGEMENT;

    case Permission.MANAGE_USERS:
      // Only Admin and PM (limited to projects)
      return [UserRole.ADMIN, UserRole.PROJECT_MANAGER].includes(role);

    default:
      return hasPermission(role, action);
  }
}

/**
 * Get user-friendly role name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    [UserRole.ADMIN]: "Administrator",
    [UserRole.PROJECT_MANAGER]: "Project Manager",
    [UserRole.TEAM_LEAD]: "Team Lead",
    [UserRole.EMPLOYEE]: "Employee",
    [UserRole.MANAGEMENT]: "Management",
  };
  return names[role] || role;
}

/**
 * Get role badge color for UI
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    [UserRole.ADMIN]: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    [UserRole.PROJECT_MANAGER]: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    [UserRole.TEAM_LEAD]: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
    [UserRole.EMPLOYEE]: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    [UserRole.MANAGEMENT]: "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400",
  };
  return colors[role] || "bg-gray-100 text-gray-700";
}
