import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";
import { getUserRole } from "@/lib/get-user-role";
import { PermissionProvider } from "@/components/providers/permission-provider";
import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";

interface TasksPageProps {
  params: {
    workspaceId: string;
  };
}

const TasksPage = async ({ params }: TasksPageProps) => {
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
      <div className="h-full flex flex-col">
        <TaskViewSwitcher />
      </div>
    </PermissionProvider>
  );
};

export default TasksPage;
