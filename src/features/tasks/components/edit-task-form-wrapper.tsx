import { LoaderIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

import { EditTaskForm } from "./edit-task-form";

import { useGetTask } from "../api/use-get-task";
import { TaskStatus, TaskPriority, TaskImportance } from "../types";

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

  const { data: projects, isLoading: isLoadingProjects } = useGetProjects({
    workspaceId,
  });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({
    workspaceId,
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
    isLoadingTask,
    isLoadingProjects, 
    isLoadingMembers,
    initialValues: !!initialValues,
    taskData: initialValues ? { id: initialValues.id, name: initialValues.name } : null
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
    importance: (initialValues.importance as TaskImportance) || TaskImportance.MEDIUM,
    description: initialValues.description || undefined,
    category: initialValues.category || undefined,
    tags: Array.isArray(initialValues.tags) ? (initialValues.tags as string[]) : undefined,
    estimatedHours: initialValues.estimatedHours || undefined,
    actualHours: initialValues.actualHours || undefined,
    dueDate: initialValues.dueDate || new Date().toISOString(),
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
