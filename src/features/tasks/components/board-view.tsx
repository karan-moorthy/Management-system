"use client";

import { useCallback } from "react";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { BoardKanban } from "@/features/tasks/components/board-kanban";
import { useBulkUpdateTasks } from "@/features/tasks/api/use-bulk-update-tasks";
import { TaskStatus } from "@/features/tasks/types";
import { useTaskFilters } from "@/features/tasks/hooks/use-task-filters";
import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";

export const BoardView = () => {
  const workspaceId = useWorkspaceId();
  const [{ projectId, assigneeId, search, dueDate }] = useTaskFilters();

  const { data: tasks, isLoading } = useGetTasks({
    workspaceId,
    projectId,
    assigneeId,
    search,
    dueDate,
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
    importance: task.importance as any,
    category: task.category ?? undefined,
    estimatedHours: task.estimatedHours ?? undefined,
    actualHours: task.actualHours ?? undefined,
    tags: task.tags as string[] ?? undefined,
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