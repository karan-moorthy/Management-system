"use client";

import { useState } from "react";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetRequirements } from "@/features/requirements/api/use-get-requirements";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, FolderKanban, FileText, Calendar, User } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { RequirementDetailsModal } from "@/features/requirements/components/requirement-details-modal";
import { usePermissionContext } from "@/components/providers/permission-provider";
import { MemberRole } from "@/features/members/types";

export const ProjectsClient = () => {
  const { data: projects, isLoading } = useGetProjects({});
  const { data: requirements, isLoading: isLoadingRequirements } = useGetRequirements();
  const { open } = useCreateProjectModal();
  const permissions = usePermissionContext();
  const [selectedRequirement, setSelectedRequirement] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRequirementClick = (requirement: any) => {
    setSelectedRequirement(requirement);
    setIsModalOpen(true);
  };

  // Check if user can view requirements (Only Admin and PM)
  const canViewRequirements = permissions.role === MemberRole.ADMIN || 
                               permissions.role === MemberRole.PROJECT_MANAGER;

  // Check if user is admin (for project creation and requirement addition)
  const isAdmin = permissions.role === MemberRole.ADMIN;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'REJECTED':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
    }
  };

  const projectList = projects?.documents || [];

  // Debug logging
  console.log('[Summary Page] Render state:', {
    isLoading,
    isLoadingRequirements,
    canViewRequirements,
    isAdmin,
    userRole: permissions.role,
    projectCount: projectList?.length || 0,
    requirementCount: requirements?.length || 0
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Projects Section - Only visible to Admins and PMs */}
      {isAdmin && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Projects</h1>
              <p className="text-muted-foreground">
                Manage and organize your projects ({projectList.length} total)
              </p>
            </div>
            <Button onClick={open}>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>

          {projectList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get started by creating your first project
                </p>
                <Button onClick={open}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectList.map((project) => (
                <Link key={project.id} href={`/tasks?projectId=${project.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <ProjectAvatar
                          image={project.imageUrl || undefined}
                          name={project.name}
                          className="h-12 w-12"
                        />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                          <CardDescription className="mt-1">
                            Created {format(new Date(project.createdAt), "MMM d, yyyy")}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {project.postDate && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Posted:</span>{" "}
                            {format(new Date(project.postDate), "MMM d, yyyy")}
                          </div>
                        )}
                        {project.tentativeEndDate && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Due:</span>{" "}
                            {format(new Date(project.tentativeEndDate), "MMM d, yyyy")}
                          </div>
                        )}
                        {project.assignees && project.assignees.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium">Team:</span> {project.assignees.length} member
                            {project.assignees.length !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Requirements Section - Visible to Admins, PMs, and Management */}
      {canViewRequirements && (
      <div className={isAdmin ? "mt-12" : ""}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{isAdmin ? "Requirements" : "Summary"}</h2>
            <p className="text-muted-foreground">
              {isAdmin 
                ? `Project requirements and submissions (${requirements?.length || 0} total)`
                : `View project requirements and details (${requirements?.length || 0} total)`
              }
            </p>
          </div>
          {isAdmin && (
            <Link href="/add-requirements">
              <Button variant="outline">
                <PlusIcon className="mr-2 h-4 w-4" />
                Add Requirement
              </Button>
            </Link>
          )}
        </div>

        {isLoadingRequirements ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : requirements && requirements.length > 0 ? (
          <div className="grid gap-4">
            {requirements.map((req: any) => (
              <Card 
                key={req.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleRequirementClick(req)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{req.tentativeTitle}</CardTitle>
                      <CardDescription className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {req.customer}
                        </span>
                        {req.projectManagerName && (
                          <span className="flex items-center gap-1">
                            <User className="size-3" />
                            PM: {req.projectManagerName}
                          </span>
                        )}
                        {req.dueDate && (
                          <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-medium">
                            <Calendar className="size-3" />
                            Due: {format(new Date(req.dueDate), "MMM dd, yyyy")}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(req.status)}>
                      {req.status}
                    </Badge>
                  </div>
                </CardHeader>
                {req.projectDescription && (
                  <CardContent>
                    <div className="flex items-start gap-2">
                      <FileText className="size-4 mt-0.5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {req.projectDescription}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                      {req.sampleInputFiles && req.sampleInputFiles.length > 0 && (
                        <span>{req.sampleInputFiles.length} input file(s)</span>
                      )}
                      {req.expectedOutputFiles && req.expectedOutputFiles.length > 0 && (
                        <span>{req.expectedOutputFiles.length} output file(s)</span>
                      )}
                      <span>Created {format(new Date(req.createdAt), "MMM dd, yyyy")}</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No requirements yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first project requirement
              </p>
              <Link href="/add-requirements">
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Requirement
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
      )}

      <RequirementDetailsModal
        requirement={selectedRequirement}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
};
