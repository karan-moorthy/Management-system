import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";
import { getUserRole } from "@/lib/get-user-role";
import { MemberRole } from "@/features/members/types";

import { WorkspaceIdSettingsClient } from "./client";

interface WorkspaceIdSettingsPageProps {
  params: {
    workspaceId: string;
  };
}

const WorkspaceIdSettingsPage = async ({ params }: WorkspaceIdSettingsPageProps) => {
  const user = await getCurrent();

  if (!user) redirect("/sign-in");

  const workspaceId = params.workspaceId;
  const userRole = await getUserRole(user.id, workspaceId);

  // Only ADMIN can access workspace settings
  if (userRole !== MemberRole.ADMIN) {
    redirect(`/workspaces/${workspaceId}`);
  }

  return (
    <WorkspaceIdSettingsClient />
  );
};

export default WorkspaceIdSettingsPage;
