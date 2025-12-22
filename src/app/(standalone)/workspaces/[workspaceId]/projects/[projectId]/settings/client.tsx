"use client";

import { useState } from "react";
import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useGetProject } from "@/features/projects/api/use-get-project";
import { EditProjectForm } from "@/features/projects/components/edit-project-form";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { ClientInvitations } from "@/features/clients/components/client-invitations";
import { usePermissionContext } from "@/components/providers/permission-provider";

export const ProjectIdSettingsClient = () => {
  const projectId = useProjectId();
  const workspaceId = useWorkspaceId();
  const { data: initialValues, isLoading } = useGetProject({ projectId });
  const { canManageUsers } = usePermissionContext();
  const [activeTab, setActiveTab] = useState("general");

  if (isLoading) {
    return <PageLoader />;
  }

  if (!initialValues) {
    return <PageError message="Project not found." />;
  }

  return (
    <div className="w-full max-w-5xl">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          {canManageUsers && (
            <TabsTrigger value="clients">Client Access</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general">
          <div className="lg:max-w-xl">
            <EditProjectForm initialValues={initialValues} />
          </div>
        </TabsContent>

        {canManageUsers && (
          <TabsContent value="clients">
            <ClientInvitations
              projectId={projectId}
              projectName={initialValues.name}
              workspaceId={workspaceId}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
