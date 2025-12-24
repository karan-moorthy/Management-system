"use client";

import { useCallback } from "react";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { BoardKanban } from "@/features/tasks/components/board-kanban";
import { useBulkUpdateTasks } from "@/features/tasks/api/use-bulk-update-tasks";
import { TaskStatus, IssueType, Resolution } from "@/features/tasks/types";
import { useTaskFilters } from "@/features/tasks/hooks/use-task-filters";
import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";

export const BoardView = () => {
  const workspaceId = useWorkspaceId();
  const [{ projectId, assigneeId, search, dueDate, month, week }] = useTaskFilters();

  const { data: tasks, isLoading } = useGetTasks({
    workspaceId,
    projectId,
    assigneeId,
    search,
    dueDate,
    month,
    week,
    limit: 2000,
  });

  const { mutate: bulkUpdate } = useBulkUpdateTasks();

  const onKanbanChange = useCallback(
    (tasks: { id: string; status: TaskStatus; position: number }[]) => {
      const formattedTasks = tasks.map(task => ({
        id: task.id,
        status: task.status,
        position: task.position
      }));
      
      bulkUpdate({
        json: { tasks: formattedTasks },
      });
    },
    [bulkUpdate]
  );

  if (isLoading) {
    return <PageLoader />;
  }

  if (!tasks) {
    return <PageError message="Failed to load tasks" />;
  }

  // Filter tasks to show only the statuses we want: TODO, IN_PROGRESS, IN_REVIEW, DONE
  const boardTasks = tasks.documents?.filter((task) => {
    const status = task.status as TaskStatus;
    return [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.DONE].includes(status);
  }).map(task => ({
    ...task,
    status: task.status as TaskStatus,
    description: task.description ?? undefined,
    priority: task.priority as any,
    issueType: (task.issueType as IssueType) || IssueType.TASK,
    resolution: (task.resolution && task.resolution !== null) ? (task.resolution as Resolution) : undefined,
    assigneeId: task.assigneeId ?? undefined,
    reporterId: task.reporterId ?? undefined,
    creatorId: task.creatorId ?? undefined,
    projectId: task.projectId ?? undefined,
    workspaceId: task.workspaceId || workspaceId,
    resolved: task.resolved ?? undefined,
    dueDate: task.dueDate ?? undefined,
    labels: task.labels ? (Array.isArray(task.labels) ? task.labels as string[] : []) : undefined,
    estimatedHours: task.estimatedHours ?? undefined,
    actualHours: task.actualHours ?? 0,
    parentTaskId: task.parentTaskId ?? undefined,
    customFields: task.customFields ? (typeof task.customFields === 'object' && task.customFields !== null ? task.customFields as { [key: string]: any } : undefined) : undefined,
    assignee: task.assignee ? {
      id: task.assignee.id,
      name: task.assignee.name || '',
      email: task.assignee.email || '',
    } : undefined,
    reporter: task.reporter ? {
      id: task.reporter.id,
      name: task.reporter.name || '',
      email: task.reporter.email || '',
    } : undefined,
    creator: task.creator ? {
      id: task.creator.id,
      name: task.creator.name || '',
      email: task.creator.email || '',
    } : undefined,
    project: task.project ?? undefined,
  })) || [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold">Board</h1>
        <p className="text-muted-foreground">
          Manage your tasks with a Kanban board view
        </p>
      </div>
      <div className="flex-1 px-6 py-4">
        <BoardKanban data={boardTasks} onChange={onKanbanChange} />
      </div>
    </div>
  );
};