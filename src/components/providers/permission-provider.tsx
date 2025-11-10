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
  canDeleteTask: boolean;
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
  role: MemberRole;
  userId: string;
  workspaceId: string;
  userProjects?: string[];
  teamMemberIds?: string[];
}

export function PermissionProvider({
  children,
  role,
  userId,
  workspaceId,
  userProjects = [],
  teamMemberIds = [],
}: PermissionProviderProps) {
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
        return role !== MemberRole.MANAGEMENT;
      
      case "VIEW_ALL_TASKS":
        return role !== MemberRole.MANAGEMENT;
      
      case "ACCESS_DASHBOARD":
        return true; // All roles have dashboard access
      
      default:
        return false;
    }
  };

  const canCreateTask = (projectId?: string): boolean => {
    if (role === MemberRole.MANAGEMENT) return false;
    if (role === MemberRole.EMPLOYEE) {
      return projectId ? userProjects.includes(projectId) : false;
    }
    return [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER, MemberRole.TEAM_LEAD].includes(role);
  };

  const canEditTask = (taskOwnerId?: string): boolean => {
    if (role === MemberRole.MANAGEMENT) return false;
    if (role === MemberRole.EMPLOYEE) {
      return taskOwnerId === userId;
    }
    if (role === MemberRole.TEAM_LEAD) {
      return taskOwnerId ? teamMemberIds.includes(taskOwnerId) : false;
    }
    return [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER].includes(role);
  };

  const canChangeStatus = (taskOwnerId?: string): boolean => {
    // Employee cannot change status - needs approval
    if (role === MemberRole.EMPLOYEE || role === MemberRole.MANAGEMENT) {
      return false;
    }
    return [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER, MemberRole.TEAM_LEAD].includes(role);
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
    canDeleteTask: hasPermission("DELETE_TASK"),
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
