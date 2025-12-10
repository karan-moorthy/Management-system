"use client";

import { LoaderIcon, PlusIcon, XIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { useCallback, useState } from "react";

import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetProject } from "@/features/projects/api/use-get-project";
import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";

import { DottedSeparator } from "@/components/dotted-separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { columns } from "./columns";
import { DataCalendar } from "./data-calendar";
import { DataFilters } from "./data-filters";
import { DataKanban } from "./data-kanban";
import { DataTable } from "./data-table";
import { JiraTableDynamic } from "./jira-table-dynamic";
import { SubtaskModal } from "./subtask-modal";

import { useGetTasks } from "../api/use-get-tasks";
import { useCreateTaskModal } from "../hooks/use-create-task-modal";
import { useTaskFilters } from "../hooks/use-task-filters";
import { TaskStatus, Task } from "../types";
import { useBulkUpdateTasks } from "../api/use-bulk-update-tasks";
import Link from "next/link";

interface TaskViewSwitcherProps {
  hideProjectFilter?: boolean;
}

export const TaskViewSwitcher = ({
  hideProjectFilter,
}: TaskViewSwitcherProps) => {
  const [{ status, assigneeId, projectId, dueDate, month, week }, setFilters] = useTaskFilters();
  const [view, setView] = useQueryState("task-view", { defaultValue: "table" });
  const { mutate: bulkUpdate } = useBulkUpdateTasks();
  
  // Subtask modal state
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<Task | null>(null);

  const workspaceId = useWorkspaceId();
  const paramProjectId = useProjectId();
  const currentProjectId = paramProjectId || projectId;
  
  // Fallback: Get first workspace if no workspaceId in route (for global tasks page)
  const { data: workspaces, isLoading: isLoadingWorkspaces } = useGetWorkspaces();
  
  // Extract workspace ID - handle both array and documents format
  const firstWorkspaceId = workspaces?.documents?.[0]?.id || workspaces?.[0]?.id;
  const effectiveWorkspaceId = workspaceId || firstWorkspaceId;

  
  // Only fetch project if we have a projectId
  const { data: project } = useGetProject({
    projectId: currentProjectId || "skip",
  });
  
  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({
    workspaceId: workspaceId, // Only filter by workspace when explicitly in workspace route
    projectId: currentProjectId,
    assigneeId,
    status,
    dueDate,
    month,
    week,
    limit: 2000, // Support large CSV uploads (e.g., 1276 rows)
  });


  const onKanbanChange = useCallback(
    (tasks: { id: string; status: TaskStatus; position: number }[]) => {
      console.log("🔄 Kanban change triggered. Updating tasks:", tasks);
      bulkUpdate({ json: { tasks } });
    },
    [bulkUpdate]
  );

  const { open } = useCreateTaskModal();

  const clearProjectFilter = () => {
    setFilters({ projectId: null });
  };

  const handleAddSubtask = (parentTaskId: string) => {
    const parentTask = tasks?.documents.find((t: Task) => t.id === parentTaskId);
    if (parentTask) {
      setParentTaskForSubtask(parentTask as Task);
      setIsSubtaskModalOpen(true);
    }
  };

  return (
    <Tabs
      defaultValue={view}
      onValueChange={setView}
      className="flex-1 w-full border rounded-lg"
    >
      <div className="h-full flex flex-col overflow-auto p-4">
        {currentProjectId && project && (
          <div className="mb-4">
            <Badge variant="secondary" className="py-1.5 px-3">
              📁 Filtering: {project.name}
              <button
                onClick={clearProjectFilter}
                className="ml-2 hover:text-destructive transition"
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          </div>
        )}
        <div className="flex flex-col gap-y-2 lg:flex-row justify-between items-center">
          <TabsList className="w-full lg:w-auto">
            <TabsTrigger className="h-8 w-full lg:w-auto" value="table">
              Table
            </TabsTrigger>
            <TabsTrigger className="h-8 w-full lg:w-auto" value="kanban">
              Kanban
            </TabsTrigger>
            <TabsTrigger className="h-8 w-full lg:w-auto" value="calendar">
              Calendar
            </TabsTrigger>
          </TabsList>
          <Button onClick={open} size="sm" className="w-full lg:w-auto">
            <PlusIcon className="size-4 mr-2" />
            New
          </Button>
        </div>
        <DottedSeparator className="my-4" />
        <DataFilters hideProjectFilter={hideProjectFilter} />
        <DottedSeparator className="my-4" />
        {isLoadingTasks || (isLoadingWorkspaces && !workspaceId) ? (
          <div className="w-full border rounded-lg h-[200px] flex flex-col items-center justify-center">
            <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="table" className="mt-0">
              {effectiveWorkspaceId ? (
                <JiraTableDynamic 
                  key={effectiveWorkspaceId}
                  data={(tasks?.documents ?? []) as Task[]}
                  workspaceId={effectiveWorkspaceId}
                  onAddSubtask={handleAddSubtask}
                />
              ) : (
                <div className="w-full border rounded-lg h-[200px] flex flex-col items-center justify-center">
                  <p className="text-muted-foreground">No workspace found</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="kanban" className="mt-0">
              <DataKanban
                data={(tasks?.documents ?? []) as Task[]}
                onChange={onKanbanChange}
              />
            </TabsContent>
            <TabsContent value="calendar" className="mt-0 h-full pb-4">
              <DataCalendar data={(tasks?.documents ?? []) as Task[]} />
            </TabsContent>
          </>
        )}
      </div>

      {/* Subtask Modal */}
      <SubtaskModal
        open={isSubtaskModalOpen}
        onOpenChange={setIsSubtaskModalOpen}
        parentTask={parentTaskForSubtask}
      />
    </Tabs>
  );
};
