/**
 * Permission Guard Component
 * Conditionally renders children based on permissions
 */
"use client";

import { ReactNode } from "react";
import { usePermissionContext } from "@/components/providers/permission-provider";

interface PermissionGuardProps {
  children: ReactNode;
  require?: keyof Omit<ReturnType<typeof usePermissionContext>, 'role' | 'userId' | 'workspaceId'>;
  fallback?: ReactNode;
}

export function PermissionGuard({ 
  children, 
  require, 
  fallback = null 
}: PermissionGuardProps) {
  const permissions = usePermissionContext();

  if (!require) {
    return <>{children}</>;
  }

  const hasPermission = permissions[require];
  
  // Handle function permissions
  if (typeof hasPermission === 'function') {
    // Can't evaluate without context, show by default
    return <>{children}</>;
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

interface ConditionalGuardProps {
  children: ReactNode;
  condition: boolean;
  fallback?: ReactNode;
}

export function ConditionalGuard({ 
  children, 
  condition, 
  fallback = null 
}: ConditionalGuardProps) {
  return condition ? <>{children}</> : <>{fallback}</>;
}
