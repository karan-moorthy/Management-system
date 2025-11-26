"use client";

import { ReactNode } from "react";
import { PermissionProvider } from "./permission-provider";
import { useGetCurrentUserRole } from "@/features/members/api/use-get-user-role";
import { MemberRole } from "@/features/members/types";

interface PermissionWrapperProps {
  children: ReactNode;
}

export function PermissionWrapper({ children }: PermissionWrapperProps) {
  const { data: roleData } = useGetCurrentUserRole();

  // Render immediately with default permissions to prevent flickering
  // The query will update in the background and React will re-render when data arrives
  const role = (roleData?.role as MemberRole) || MemberRole.MEMBER;
  const workspaceId = roleData?.workspaceId || "";

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

