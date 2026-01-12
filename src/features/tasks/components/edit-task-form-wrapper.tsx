import { LoaderIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

import { EditTaskForm } from "./edit-task-form";

import { useGetTask } from "../api/use-get-task";
import { TaskStatus, TaskPriority, IssueType, Resolution } from "../types";

interface EditTaskFormWrapperProps {
  onCancel: () => void;
  id: string;
}

export const EditTaskFormWrapper = ({
  onCancel,
  id,
}: EditTaskFormWrapperProps) => {
  const workspaceId = useWorkspaceId();

  const { data: initialValues, isLoading: isLoadingTask } = useGetTask({
    taskId: id,
  });

  // Check if we have a valid workspaceId (not "undefined" string or null)
  const hasValidWorkspace = workspaceId && workspaceId !== "undefined" && workspaceId !== "null";

  const { data: projects, isLoading: isLoadingProjects } = useGetProjects({
    workspaceId: hasValidWorkspace ? workspaceId : "",
  });
  
  // Fetch ALL users for task assignment (not restricted by employee's project access)
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({
    workspaceId: hasValidWorkspace ? workspaceId : "",
    forTaskAssignment: true, // Get all employees for assignee dropdown
  });

  const projectOptions = projects?.documents.map((project) => ({
    id: project.id,
    name: project.name,
    imageUrl: project.imageUrl || "",
  }));

  const memberOptions = members?.documents.map((member) => ({
    id: member.userId,
    name: member.name,
  }));

  const isLoading = isLoadingProjects || isLoadingMembers || isLoadingTask;

  // Debug logging
  console.log("EditTaskFormWrapper - Debug Info:", {
    id,
    workspaceId,
    hasValidWorkspace,
    isLoadingTask,
    isLoadingProjects, 
    isLoadingMembers,
    hasProjects: !!projects,
    hasMembers: !!members,
    projectCount: projectOptions?.length ?? 0,
    memberCount: memberOptions?.length ?? 0,
    initialValues: !!initialValues,
    taskData: initialValues ? { 
      id: initialValues.id, 
      summary: initialValues.summary,
      workspaceId: initialValues.workspaceId,
      projectId: initialValues.projectId
    } : null
  });

  if (isLoading) {
    return (
      <Card className="w-full h-[714px] border-none shadow-none">
        <CardContent className="flex items-center justify-center h-full">
          <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading task data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!initialValues) {
    return (
      <Card className="w-full h-[714px] border-none shadow-none">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-sm text-red-500">Failed to load task data for ID: {id}</p>
          <p className="text-xs text-muted-foreground mt-2">Check console for details</p>
        </CardContent>
      </Card>
    );
  }

  // Transform the data to match Task interface
  const taskData = {
    ...initialValues,
    status: initialValues.status as TaskStatus,
    priority: (initialValues.priority as TaskPriority) || TaskPriority.MEDIUM,
    issueType: (initialValues.issueType as IssueType) || IssueType.TASK,
    resolution: initialValues.resolution ? (initialValues.resolution as Resolution) : undefined,
    assigneeId: initialValues.assigneeId || undefined,
    reporterId: initialValues.reporterId || undefined,
    creatorId: initialValues.creatorId || undefined,
    projectId: initialValues.projectId || undefined,
    resolved: initialValues.resolved || undefined,
    labels: Array.isArray(initialValues.labels) ? (initialValues.labels as string[]) : undefined,
    description: initialValues.description || undefined,
    estimatedHours: initialValues.estimatedHours || undefined,
    actualHours: initialValues.actualHours || 0,
    dueDate: initialValues.dueDate || undefined,
    workspaceId: initialValues.workspaceId || "",
    assignee: initialValues.assignee || undefined,
    reporter: initialValues.reporter || undefined,
    creator: initialValues.creator || undefined,
    project: initialValues.project || undefined,
  };

  return (
    <EditTaskForm
      onCancel={onCancel}
      projectOptions={projectOptions ?? []}
      memberOptions={memberOptions ?? []}
      initialValues={taskData}
    />
  );
};
