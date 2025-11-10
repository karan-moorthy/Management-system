import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";
import { getUserRole } from "@/lib/get-user-role";
import { PermissionProvider } from "@/components/providers/permission-provider";
import { BoardView } from "@/features/tasks/components/board-view";

interface BoardPageProps {
  params: {
    workspaceId: string;
  };
}

const BoardPage = async ({ params }: BoardPageProps) => {
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
      <div>
        <BoardView />
      </div>
    </PermissionProvider>
  );
};

export default BoardPage;