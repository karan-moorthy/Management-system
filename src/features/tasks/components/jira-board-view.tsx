import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetBoardColumns } from "../api/use-board-columns";
import { AddColumnModal } from "./add-column-modal";
import { useGetTasks } from "../api/use-get-tasks";
import { Task } from "../types";

interface JiraBoardViewProps {
  workspaceId: string;
}

export function JiraBoardView({ workspaceId }: JiraBoardViewProps) {
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  
  const { data: columns, isLoading: columnsLoading } = useGetBoardColumns(workspaceId);
  const { data: tasksData, isLoading: tasksLoading } = useGetTasks({ workspaceId });

  const tasks = (tasksData?.documents || []) as Task[];

  const isLoading = columnsLoading || tasksLoading;

  // Group tasks by their status
  const getTasksForColumn = (columnCategory: string) => {
    if (!tasks || tasks.length === 0) return [];
    return tasks.filter((task) => {
      // Match task status to column category
      const taskStatus = task.status?.toUpperCase();
      if (columnCategory === "TODO") {
        return taskStatus === "TODO" || taskStatus === "BACKLOG" || taskStatus === "TO_DO";
      } else if (columnCategory === "IN_PROGRESS") {
        return taskStatus === "IN_PROGRESS" || taskStatus === "IN PROGRESS";
      } else if (columnCategory === "DONE") {
        return taskStatus === "DONE" || taskStatus === "COMPLETED";
      }
      return false;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading board...</div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold">Board View</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddColumnModalOpen(true)}
          className="ml-auto"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Column
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns?.map((column) => {
          const columnTasks = getTasksForColumn(column.category);
          
          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80"
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <CardTitle className="text-sm font-medium">
                      {column.name}
                    </CardTitle>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {columnTasks.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {columnTasks.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No tasks
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <AddColumnModal
        workspaceId={workspaceId}
        open={isAddColumnModalOpen}
        onOpenChange={setIsAddColumnModalOpen}
        currentColumnCount={columns?.length || 0}
      />
    </div>
  );
}

interface TaskCardProps {
  task: Task;
}

function TaskCard({ task }: TaskCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium line-clamp-2">
              {task.summary}
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{task.issueId}</span>
            {task.priority && (
              <>
                <span>•</span>
                <span className="capitalize">{task.priority.toLowerCase()}</span>
              </>
            )}
          </div>

          {task.assigneeId && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                {task.assignee?.name?.charAt(0).toUpperCase() || "?"}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
