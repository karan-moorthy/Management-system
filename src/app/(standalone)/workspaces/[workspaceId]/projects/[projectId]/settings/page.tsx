import { redirect } from "next/navigation";

import { getCurrent } from "@/features/auth/queries";
import { getUserRole } from "@/lib/get-user-role";
import { MemberRole } from "@/features/members/types";

import { ProjectIdSettingsClient } from "./client";

interface ProjectIdSettingsPageProps {
  params: {
    workspaceId: string;
    projectId: string;
  };
}

const ProjectIdSettingsPage = async ({ params }: ProjectIdSettingsPageProps) => {
  const user = await getCurrent();

  if (!user) redirect("/sign-in");

  const workspaceId = params.workspaceId;
  const userRole = await getUserRole(user.id, workspaceId);

  // Only ADMIN and PROJECT_MANAGER can access project settings
  const allowedRoles = [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER];
  if (!allowedRoles.includes(userRole)) {
    redirect(`/workspaces/${workspaceId}/projects/${params.projectId}`);
  }

  return <ProjectIdSettingsClient />;
};

export default ProjectIdSettingsPage;
