"use client";

import { ReactNode } from "react";
import { PermissionProvider } from "./permission-provider";
import { useGetCurrentUserRole } from "@/features/members/api/use-get-user-role";
import { MemberRole } from "@/features/members/types";

interface PermissionWrapperProps {
  children: ReactNode;
}

export function PermissionWrapper({ children }: PermissionWrapperProps) {
  const { data: roleData, isLoading } = useGetCurrentUserRole();

  // Wait for role data to load to prevent showing wrong permissions
  if (isLoading || !roleData) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const role = (roleData.role as MemberRole) || MemberRole.MEMBER;
  const workspaceId = roleData.workspaceId || "";

  return (
    <PermissionProvider
      role={role}
      userId=""
      workspaceId={workspaceId}
      userProjects={[]}
      teamMemberIds={[]}
    >
      {children}
    </PermissionProvider>
  );
}

