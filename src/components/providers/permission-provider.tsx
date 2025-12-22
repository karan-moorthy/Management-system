/**
 * Permission Context Provider
 * Provides current user's role and permissions throughout the app
 */
"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { MemberRole } from "@/features/members/types";

interface PermissionContextType {
  role: MemberRole;
  userId: string;
  workspaceId: string;
  canCreateProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canCreateTask: (projectId?: string) => boolean;
  canEditTask: (taskOwnerId?: string) => boolean;
  canDeleteTask: (taskOwnerId?: string, taskProjectId?: string | null) => boolean;
  canAssignTask: boolean;
  canChangeStatus: (taskOwnerId?: string) => boolean;
  canManageUsers: boolean;
  canComment: boolean;
  canViewAllTasks: boolean;
  canAccessDashboard: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
  role?: MemberRole;
  userId?: string;
  workspaceId?: string;
  userProjects?: string[];
  teamMemberIds?: string[];
}

export function PermissionProvider({
  children,
  role = MemberRole.ADMIN,
  userId = "",
  workspaceId = "",
  userProjects = [],
  teamMemberIds = [],
}: PermissionProviderProps) {
  console.log('[PermissionProvider] Initialized with:', { role, userId, workspaceId });
  
  // Helper function to check permissions based on role
  const hasPermission = (action: string): boolean => {
    switch (action) {
      case "CREATE_PROJECT":
        return role === MemberRole.ADMIN;
      
      case "EDIT_PROJECT":
        return role === MemberRole.ADMIN;
      
      case "DELETE_PROJECT":
        return role === MemberRole.ADMIN;
      
      case "DELETE_TASK":
        return [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER].includes(role);
      
      case "ASSIGN_TASK":
        return [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER, MemberRole.TEAM_LEAD].includes(role);
      
      case "MANAGE_USERS":
        return [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER].includes(role);
      
      case "COMMENT":
        // CLIENT can comment, MANAGEMENT cannot
        if (role === MemberRole.CLIENT) return true;
        return role !== MemberRole.MANAGEMENT;
      
      case "VIEW_ALL_TASKS":
        // CLIENT cannot view all tasks (only their assigned project)
        if (role === MemberRole.CLIENT) return false;
        return role !== MemberRole.MANAGEMENT;
      
      case "ACCESS_DASHBOARD":
        return true; // All roles have dashboard access
      
      default:
        return false;
    }
  };

  const canCreateTask = (projectId?: string): boolean => {
    // CLIENT cannot create tasks (read-only)
    if (role === MemberRole.CLIENT) return false;
    if (role === MemberRole.MANAGEMENT) return false;
    if (role === MemberRole.EMPLOYEE) {
      return projectId ? userProjects.includes(projectId) : false;
    }
    return [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER, MemberRole.TEAM_LEAD].includes(role);
  };

  const canEditTask = (taskOwnerId?: string): boolean => {
    console.log('[Permission Check] canEditTask:', { 
      role, 
      userId, 
      taskOwnerId,
      isAdmin: [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER].includes(role)
    });
    
    // CLIENT cannot edit tasks (read-only)
    if (role === MemberRole.CLIENT) {
      console.log('[Permission Check] CLIENT - read only');
      return false;
    }
    
    // Admin and Project Manager can edit all tasks
    if ([MemberRole.ADMIN, MemberRole.PROJECT_MANAGER].includes(role)) {
      console.log('[Permission Check] Admin/PM access granted');
      return true;
    }
    
    // Employees can only edit their own tasks
    if (role === MemberRole.EMPLOYEE) {
      const canEdit = taskOwnerId === userId;
      console.log('[Permission Check] Employee access:', canEdit, { taskOwnerId, userId });
      return canEdit;
    }
    
    // All other roles have read-only access (TEAM_LEAD, MANAGEMENT)
    console.log('[Permission Check] Other role - read only');
    return false;
  };

  const canChangeStatus = (taskOwnerId?: string): boolean => {
    // CLIENT cannot change status (read-only)
    if (role === MemberRole.CLIENT) return false;
    
    // Admin and Project Manager can change status on all tasks
    if ([MemberRole.ADMIN, MemberRole.PROJECT_MANAGER].includes(role)) {
      return true;
    }
    // Employees can change status on their own tasks only
    if (role === MemberRole.EMPLOYEE) {
      return taskOwnerId === userId;
    }
    // All other roles cannot change status (read-only)
    return false;
  };

  const canDeleteTask = (taskOwnerId?: string, taskProjectId?: string | null): boolean => {
    // CLIENT cannot delete tasks (read-only)
    if (role === MemberRole.CLIENT) return false;
    
    // Admin and Project Manager can delete all tasks
    if (role === MemberRole.ADMIN || role === MemberRole.PROJECT_MANAGER) {
      return true;
    }
    // Employees can only delete their own INDIVIDUAL tasks (no project)
    if (role === MemberRole.EMPLOYEE) {
      const isIndividualTask = taskProjectId === null;
      return isIndividualTask && taskOwnerId === userId;
    }
    // All other roles cannot delete tasks (read-only)
    return false;
  };

  const value: PermissionContextType = {
    role,
    userId,
    workspaceId,
    canCreateProject: hasPermission("CREATE_PROJECT"),
    canEditProject: hasPermission("EDIT_PROJECT"),
    canDeleteProject: hasPermission("DELETE_PROJECT"),
    canCreateTask,
    canEditTask,
    canDeleteTask,
    canAssignTask: hasPermission("ASSIGN_TASK"),
    canChangeStatus,
    canManageUsers: hasPermission("MANAGE_USERS"),
    canComment: hasPermission("COMMENT"),
    canViewAllTasks: hasPermission("VIEW_ALL_TASKS"),
    canAccessDashboard: hasPermission("ACCESS_DASHBOARD"),
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissionContext() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissionContext must be used within PermissionProvider");
  }
  return context;
}
