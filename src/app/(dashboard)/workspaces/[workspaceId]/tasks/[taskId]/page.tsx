import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";
import { getUserRole } from "@/lib/get-user-role";
import { PermissionProvider } from "@/components/providers/permission-provider";

import { TaskIdClient } from "./client";

interface TaskIdPageProps {
  params: {
    workspaceId: string;
    taskId: string;
  };
}

const TaskIdPage = async ({ params }: TaskIdPageProps) => {
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
      <TaskIdClient />
    </PermissionProvider>
  );
};

export default TaskIdPage;
