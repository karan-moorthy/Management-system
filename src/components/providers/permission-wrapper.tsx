"use client";

import { ReactNode } from "react";
import { PermissionProvider } from "./permission-provider";
import { useGetCurrentUserRole } from "@/features/members/api/use-get-user-role";
import { MemberRole } from "@/features/members/types";
import { Loader2 } from "lucide-react";

interface PermissionWrapperProps {
  children: ReactNode;
}

export function PermissionWrapper({ children }: PermissionWrapperProps) {
  const { data: roleData, isLoading } = useGetCurrentUserRole();

  // Show loading state while fetching role to prevent UI flicker
  if (isLoading || !roleData) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const role = roleData.role as MemberRole;
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

