import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";
import { getUserRole } from "@/lib/get-user-role";
import { MemberRole } from "@/features/members/types";
import { MembersList } from "@/features/workspaces/components/members-list";

interface WorkspaceIdMembersPageProps {
  params: {
    workspaceId: string;
  };
}

const WorkspaceIdMembersPage = async ({ params }: WorkspaceIdMembersPageProps) => {
  const user = await getCurrent();

  if (!user) redirect("/sign-in");

  const workspaceId = params.workspaceId;
  const userRole = await getUserRole(user.id, workspaceId);

  // Only ADMIN and PROJECT_MANAGER can access member management
  const allowedRoles = [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER];
  if (!allowedRoles.includes(userRole)) {
    redirect(`/workspaces/${workspaceId}`);
  }

  return (
    <div className="w-full lg:max-w-xl">
      <MembersList />
    </div>
  );
};

export default WorkspaceIdMembersPage;
