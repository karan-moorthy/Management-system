import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";
import { getUserRole } from "@/lib/get-user-role";
import { PermissionProvider } from "@/components/providers/permission-provider";

import { WorkspaceIdClient } from "./client";

interface WorkspaceIdPageProps {
  params: {
    workspaceId: string;
  };
}

const WorkspaceIdPage = async ({ params }: WorkspaceIdPageProps) => {
  const user = await getCurrent();

  if (!user) redirect("/sign-in");

  const workspaceId = params.workspaceId;
  const userRole = await getUserRole(user.id, workspaceId);

  return (
    <PermissionProvider 
      userId={user.id} 
      workspaceId={workspaceId} 
      role={userRole}
    >
      <WorkspaceIdClient />
    </PermissionProvider>
  );
};

export default WorkspaceIdPage;
