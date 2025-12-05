"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, MoreVertical, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { TaskActions } from "./task-actions";
import { TaskDate } from "./task-date";
import { Task } from "../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddColumnModal } from "./add-column-modal";
import { useGetBoardColumns } from "../api/use-board-columns";

interface JiraTableProps {
  data: Task[];
  workspaceId: string;
  onAddSubtask?: (parentTaskId: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  "Low": "bg-blue-100 text-blue-800",
  "Medium": "bg-yellow-100 text-yellow-800",
  "High": "bg-orange-100 text-orange-800",
  "Critical": "bg-red-100 text-red-800",
};

export function JiraTable({ data, workspaceId, onAddSubtask }: JiraTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  
  const { data: columns } = useGetBoardColumns(workspaceId);

  // Organize tasks into parent-child hierarchy
  const { parentTasks, childrenMap } = organizeTaskHierarchy(data);

  const toggleRow = (taskId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Column Management Header - Only show if workspaceId is available */}
      {workspaceId && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Columns3 className="h-4 w-4" />
            <span>{columns?.length || 0} board columns configured</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsColumnModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Column
          </Button>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 border-b">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm font-medium text-muted-foreground">
            <div className="col-span-1">ID</div>
            <div className="col-span-4">Summary</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Priority</div>
            <div className="col-span-2">Project</div>
            <div className="col-span-1">Assignee</div>
            <div className="col-span-1">Actions</div>
          </div>
        </div>

      {/* Body */}
      <div className="divide-y">
        {parentTasks.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground">
            No tasks found
          </div>
        ) : (
          parentTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              level={0}
              childrenMap={childrenMap}
              expandedRows={expandedRows}
              toggleRow={toggleRow}
              onAddSubtask={onAddSubtask}
            />
          ))
        )}
      </div>
    </div>

      {/* Add Column Modal - Only render if workspaceId is available */}
      {workspaceId && (
        <AddColumnModal
          workspaceId={workspaceId}
          open={isColumnModalOpen}
          onOpenChange={setIsColumnModalOpen}
          currentColumnCount={columns?.length || 0}
        />
      )}
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  level: number;
  childrenMap: Map<string, Task[]>;
  expandedRows: Set<string>;
  toggleRow: (taskId: string) => void;
  onAddSubtask?: (parentTaskId: string) => void;
}

function TaskRow({
  task,
  level,
  childrenMap,
  expandedRows,
  toggleRow,
  onAddSubtask,
}: TaskRowProps) {
  const children = childrenMap.get(task.id) || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedRows.has(task.id);

  return (
    <>
      {/* Parent Row */}
      <div
        className={cn(
          "grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/50 transition-colors",
          level > 0 && "bg-muted/20"
        )}
      >
        {/* ID with expand/collapse */}
        <div className="col-span-1 flex items-center gap-1">
          <div style={{ marginLeft: `${level * 20}px` }} className="flex items-center gap-1">
            {hasChildren ? (
              <button
                onClick={() => toggleRow(task.id)}
                className="hover:bg-accent rounded p-0.5 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}
            <span className="font-mono text-xs">{task.issueId}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="col-span-4 flex items-center gap-2">
          <p className="line-clamp-1 text-sm">{task.summary}</p>
        </div>

        {/* Type */}
        <div className="col-span-1 flex items-center">
          <Badge variant="outline" className="text-xs">
            {task.issueType}
          </Badge>
        </div>

        {/* Status */}
        <div className="col-span-1 flex items-center">
          <Badge variant="secondary" className="text-xs">
            {task.status}
          </Badge>
        </div>

        {/* Priority */}
        <div className="col-span-1 flex items-center">
          {task.priority && (
            <Badge
              variant="outline"
              className={cn("text-xs", PRIORITY_COLORS[task.priority] || "")}
            >
              {task.priority}
            </Badge>
          )}
        </div>

        {/* Project */}
        <div className="col-span-2 flex items-center">
          {task.project ? (
            <div className="flex items-center gap-2">
              <ProjectAvatar
                name={task.project.name}
                image={task.project.imageUrl ?? undefined}
                className="size-5"
              />
              <span className="text-sm truncate">{task.project.name}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">No project</span>
          )}
        </div>

        {/* Assignee */}
        <div className="col-span-1 flex items-center">
          {task.assignee ? (
            <MemberAvatar
              name={task.assignee.name}
              className="size-6"
              fallbackClassName="text-xs"
            />
          ) : (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          )}
        </div>

        {/* Actions */}
        <div className="col-span-1 flex items-center gap-2">
          {onAddSubtask && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onAddSubtask(task.id)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <TaskActions id={task.id} projectId={task.projectId ?? null}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </TaskActions>
        </div>
      </div>

      {/* Children Rows (Subtasks) */}
      {hasChildren && isExpanded && (
        <>
          {children.map((child) => (
            <TaskRow
              key={child.id}
              task={child}
              level={level + 1}
              childrenMap={childrenMap}
              expandedRows={expandedRows}
              toggleRow={toggleRow}
              onAddSubtask={onAddSubtask}
            />
          ))}
        </>
      )}
    </>
  );
}

// Helper function to organize tasks into parent-child hierarchy
function organizeTaskHierarchy(tasks: Task[]) {
  const childrenMap = new Map<string, Task[]>();
  const parentTasks: Task[] = [];

  // First pass: identify parent tasks and build children map
  tasks.forEach((task) => {
    if (!task.parentTaskId) {
      parentTasks.push(task);
    } else {
      const siblings = childrenMap.get(task.parentTaskId) || [];
      siblings.push(task);
      childrenMap.set(task.parentTaskId, siblings);
    }
  });

  return { parentTasks, childrenMap };
}
