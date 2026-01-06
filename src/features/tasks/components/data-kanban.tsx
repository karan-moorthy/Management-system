import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

import { KanbanCard } from "./kanban-card";
import { KanbanColumnHeader } from "./kanban-column-header";
import { AddColumnButton } from "./add-column-button";
import { TaskOverviewForm } from "./task-overview-form";
import { TaskDetailsDrawer } from "./task-details-drawer";
import { usePermissionContext } from "@/components/providers/permission-provider";
import { MemberRole } from "@/features/members/types";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetDefaultWorkflow } from "../api/use-workflows";
import { useCurrent } from "@/features/auth/api/use-current";

import { Task, TaskStatus } from "../types";
import "./kanban-optimizations.css";

const DEFAULT_BOARDS: TaskStatus[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
];

// Jira-style: Load only limited tasks per column initially
const INITIAL_TASKS_PER_COLUMN = 50;
const LOAD_MORE_BATCH = 25;

type TasksState = {
  [key in TaskStatus]: Task[];
};

type VisibleTasksState = {
  [key in TaskStatus]: number; // Number of visible tasks per column
};

interface DataKanbanProps {
  data: Task[];
  onChange: (
    tasks: { id: string; status: TaskStatus; position: number }[]
  ) => void;
}

export const DataKanban = ({ data, onChange }: DataKanbanProps) => {
  const { role } = usePermissionContext();
  const isAdmin = role === MemberRole.ADMIN || role === MemberRole.PROJECT_MANAGER;
  const workspaceId = useWorkspaceId();
  const { data: currentUser } = useCurrent();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Fetch workflow to get dynamic columns
  const { data: workflow } = useGetDefaultWorkflow(workspaceId);
  
  // Use workflow statuses if available, otherwise fall back to default
  const boards = useMemo(() => {
    if (workflow?.statuses && Array.isArray(workflow.statuses)) {
      return workflow.statuses.map((s: any) => s.key as TaskStatus);
    }
    return DEFAULT_BOARDS;
  }, [workflow]);
  
  // Overview form state
  const [overviewFormOpen, setOverviewFormOpen] = useState(false);
  const [taskForOverview, setTaskForOverview] = useState<Task | null>(null);
  const [pendingDragUpdate, setPendingDragUpdate] = useState<{
    updates: { id: string; status: TaskStatus; position: number }[];
  } | null>(null);

  // Track visible task count per column (Jira-style pagination)
  const [visibleTasks, setVisibleTasks] = useState<VisibleTasksState>({
    [TaskStatus.BACKLOG]: INITIAL_TASKS_PER_COLUMN,
    [TaskStatus.TODO]: INITIAL_TASKS_PER_COLUMN,
    [TaskStatus.IN_PROGRESS]: INITIAL_TASKS_PER_COLUMN,
    [TaskStatus.IN_REVIEW]: INITIAL_TASKS_PER_COLUMN,
    [TaskStatus.DONE]: INITIAL_TASKS_PER_COLUMN,
  });

  // Memoize the sorting function to avoid recreating it on every render
  const sortTasks = useCallback((tasks: Task[], status: TaskStatus) => {
    return [...tasks].sort((a, b) => {
      // Special sorting for TODO column: prioritize by due date
      if (status === TaskStatus.TODO) {
        // Tasks with due dates come first
        const aHasDueDate = a.dueDate && a.dueDate.trim() !== '';
        const bHasDueDate = b.dueDate && b.dueDate.trim() !== '';
        
        if (aHasDueDate && !bHasDueDate) return -1;
        if (!aHasDueDate && bHasDueDate) return 1;
        
        // If both have due dates, sort by due date (earliest first)
        if (aHasDueDate && bHasDueDate) {
          const dateA = new Date(a.dueDate!);
          const dateB = new Date(b.dueDate!);
          const dateDiff = dateA.getTime() - dateB.getTime();
          if (dateDiff !== 0) return dateDiff;
        }
      }
      
      // Fallback to position sorting for all other cases
      return a.position - b.position;
    });
  }, []);

  // Memoize task organization to avoid recalculating on every render
  const organizedTasks = useMemo(() => {
    const tasksByStatus: TasksState = {
      [TaskStatus.BACKLOG]: [],
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.IN_REVIEW]: [],
      [TaskStatus.DONE]: [],
    };

    data.forEach((task) => {
      tasksByStatus[task.status].push(task);
    });

    // Sort each status column
    Object.keys(tasksByStatus).forEach((status) => {
      tasksByStatus[status as TaskStatus] = sortTasks(
        tasksByStatus[status as TaskStatus],
        status as TaskStatus
      );
    });

    return tasksByStatus;
  }, [data, sortTasks]);

  const [tasks, setTasks] = useState<TasksState>(organizedTasks);

  useEffect(() => {
    setTasks(organizedTasks);
  }, [organizedTasks]);

  // Jira-style: Load more tasks handler
  const loadMoreTasks = useCallback((status: TaskStatus) => {
    setVisibleTasks((prev) => ({
      ...prev,
      [status]: prev[status] + LOAD_MORE_BATCH,
    }));
  }, []);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const { source, destination } = result;
      const sourceStatus = source.droppableId as TaskStatus;
      const destStatus = destination.droppableId as TaskStatus;

      // Find the task being moved
      const sourceColumn = tasks[sourceStatus];
      const movedTask = sourceColumn[source.index];

      if (!movedTask) {
        console.error("No task found at the source index");
        return;
      }

      // Determine if this is an individual task (employee's own task that they created)
      // Individual task criteria:
      // 1. No projectId (not part of a project)
      // 2. Created by the current user (creatorId matches userId)
      // 3. Assigned to the current user (assigneeId matches userId)
      // If ANY of these fail, it's an admin-assigned task requiring approval
      const isOwnTask = currentUser && 
                        movedTask.creatorId === currentUser.id && 
                        movedTask.assigneeId === currentUser.id;
      const isIndividualTask = !movedTask.projectId && isOwnTask;
      
      console.log('🔍 Task move debug:', {
        taskId: movedTask.id,
        summary: movedTask.summary,
        projectId: movedTask.projectId,
        workspaceId: movedTask.workspaceId,
        creatorId: movedTask.creatorId,
        assigneeId: movedTask.assigneeId,
        currentUserId: currentUser?.id,
        isOwnTask,
        isIndividualTask,
        isAdmin,
        sourceStatus,
        destStatus
      });

      // PREVENT: Don't allow non-admins to move approved tasks out of Done status
      // EXCEPTION: Individual tasks can be moved freely by their owner
      if (!isAdmin && !isIndividualTask && sourceStatus === TaskStatus.DONE && destStatus !== TaskStatus.DONE) {
        alert("Approved tasks cannot be moved out of Done. Please contact an admin if changes are needed.");
        return;
      }

      // ENFORCE SEQUENTIAL WORKFLOW: TODO -> IN_PROGRESS -> IN_REVIEW -> DONE
      // Admins can move tasks anywhere
      // EXCEPTION: Employees can move their own individual tasks anywhere
      if (!isAdmin && !isIndividualTask) {
        const statusOrder = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.DONE];
        const sourceIndex = statusOrder.indexOf(sourceStatus);
        const destIndex = statusOrder.indexOf(destStatus);
        
        // Allow moving within same column or to adjacent columns only
        if (sourceStatus !== destStatus) {
          const diff = Math.abs(destIndex - sourceIndex);
          if (diff > 1) {
            const nextStatus = sourceIndex < destIndex 
              ? statusOrder[sourceIndex + 1] 
              : statusOrder[sourceIndex - 1];
            const statusNames: Record<TaskStatus, string> = {
              [TaskStatus.BACKLOG]: "Backlog",
              [TaskStatus.TODO]: "To Do",
              [TaskStatus.IN_PROGRESS]: "In Progress",
              [TaskStatus.IN_REVIEW]: "In Review",
              [TaskStatus.DONE]: "Done"
            };
            alert(`Tasks must move step-by-step. Please move to "${statusNames[nextStatus]}" first.`);
            return;
          }
        }
      }

      // INTERCEPT: If moving to In Review or Done from any other status, open overview form
      // After submission, task will move to IN_REVIEW for admin review
      // Admins can skip this and move tasks directly
      // EXCEPTION: Individual tasks don't need overview form
      console.log('🔍 Overview form check:', {
        isAdmin,
        isIndividualTask,
        destStatus,
        sourceStatus,
        shouldShowForm: !isAdmin && !isIndividualTask && (destStatus === TaskStatus.IN_REVIEW || destStatus === TaskStatus.DONE) && 
          sourceStatus !== TaskStatus.IN_REVIEW && 
          sourceStatus !== TaskStatus.DONE
      });
      
      if (!isAdmin && !isIndividualTask && (destStatus === TaskStatus.IN_REVIEW || destStatus === TaskStatus.DONE) && 
          sourceStatus !== TaskStatus.IN_REVIEW && 
          sourceStatus !== TaskStatus.DONE) {
        console.log('✅ Opening overview form for task:', movedTask.summary);
        setTaskForOverview(movedTask);
        setOverviewFormOpen(true);
        
        // Store the intended update - always move to IN_REVIEW for admin review
        // This ensures admin gets to review the task first
        const tempUpdates = calculateDragUpdates(source, destination, sourceStatus, TaskStatus.IN_REVIEW, movedTask);
        setPendingDragUpdate({ updates: tempUpdates });
        return;
      }

      // Normal drag behavior for non-Done moves
      const updatesPayload = calculateDragUpdates(source, destination, sourceStatus, destStatus, movedTask);

      setTasks((prevTasks) => {
        const newTasks = { ...prevTasks };

        // Remove from source
        const sourceColumn = [...newTasks[sourceStatus]];
        sourceColumn.splice(source.index, 1);
        newTasks[sourceStatus] = sourceColumn;

        // Add to destination
        const updatedMovedTask = sourceStatus !== destStatus
          ? { ...movedTask, status: destStatus }
          : movedTask;
        
        const destColumn = [...newTasks[destStatus]];
        destColumn.splice(destination.index, 0, updatedMovedTask);
        newTasks[destStatus] = destColumn;

        return newTasks;
      });

      onChange(updatesPayload);
    },
    [tasks, onChange]
  );

  // Helper function to calculate position updates
  const calculateDragUpdates = useCallback((
    source: { index: number; droppableId: string },
    destination: { index: number; droppableId: string },
    sourceStatus: TaskStatus,
    destStatus: TaskStatus,
    movedTask: Task
  ) => {
    const updatesPayload: {
      id: string;
      status: TaskStatus;
      position: number;
    }[] = [];

    // Always update the moved task
    updatesPayload.push({
      id: movedTask.id,
      status: destStatus,
      position: Math.min((destination.index + 1) * 1000, 1_000_000),
    });

    // Update positions for tasks in destination column
    const destColumn = tasks[destStatus];
    destColumn.forEach((task, index) => {
      if (task && task.id !== movedTask.id) {
        const adjustedIndex = index >= destination.index ? index + 1 : index;
        const newPosition = Math.min((adjustedIndex + 1) * 1000, 1_000_000);
        if (task.position !== newPosition) {
          updatesPayload.push({
            id: task.id,
            status: destStatus,
            position: newPosition,
          });
        }
      }
    });

    // Update source column positions if cross-column move
    if (sourceStatus !== destStatus) {
      const sourceColumn = tasks[sourceStatus];
      sourceColumn.forEach((task, index) => {
        if (task && task.id !== movedTask.id) {
          const adjustedIndex = index > source.index ? index - 1 : index;
          const newPosition = Math.min((adjustedIndex + 1) * 1000, 1_000_000);
          if (task.position !== newPosition) {
            updatesPayload.push({
              id: task.id,
              status: sourceStatus,
              position: newPosition,
            });
          }
        }
      });
    }

    return updatesPayload;
  }, [tasks]);

  // Handle successful overview submission
  const handleOverviewSuccess = useCallback(() => {
    console.log("✅ Overview form submitted successfully!");
    console.log("📋 Pending drag update:", pendingDragUpdate);
    
    if (pendingDragUpdate && taskForOverview) {
      console.log("🔄 Applying pending drag update to move task to IN_REVIEW");
      
      // First update local state to reflect the move to IN_REVIEW
      setTasks((prevTasks) => {
        const newTasks = { ...prevTasks };
        
        // Find and remove from current column
        Object.keys(newTasks).forEach((status) => {
          const columnStatus = status as TaskStatus;
          newTasks[columnStatus] = newTasks[columnStatus].filter(
            (t) => t.id !== taskForOverview.id
          );
        });
        
        // Add to IN_REVIEW column (not DONE - admin needs to review first)
        const updatedTask = { ...taskForOverview, status: TaskStatus.IN_REVIEW };
        newTasks[TaskStatus.IN_REVIEW] = [...newTasks[TaskStatus.IN_REVIEW], updatedTask];
        
        console.log("✅ Local state updated - task moved to IN_REVIEW column");
        return newTasks;
      });
      
      // Then apply the pending drag update with a small delay to ensure state is updated
      setTimeout(() => {
        console.log("🔄 Notifying parent component of drag update");
        onChange(pendingDragUpdate.updates);
      }, 50);
      
      // Reset states
      setPendingDragUpdate(null);
    } else {
      console.warn("⚠️ No pending drag update or task found!");
    }
    
    // Close the form
    setOverviewFormOpen(false);
    setTaskForOverview(null);
  }, [pendingDragUpdate, taskForOverview, onChange]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-2 mb-4">
        {isAdmin && (
          <AddColumnButton
            workspaceId={workspaceId}
            onColumnAdded={(column) => {
              console.log("Column added:", column);
              // Refresh workflow data
            }}
          />
        )}
      </div>
      
      <div className="flex overflow-x-auto kanban-horizontal-scroll kanban-board-container">
        {boards.map((board: TaskStatus) => {
          const allColumnTasks = tasks[board];
          const visibleCount = visibleTasks[board];
          
          // Jira-style: Show only limited tasks per column
          const columnTasks = allColumnTasks.slice(0, visibleCount);
          const hasMore = allColumnTasks.length > visibleCount;
          
          return (
            <div
              key={board}
              className="flex-1 mx-2 bg-muted p-1.5 rounded-md min-w-[200px] kanban-column"
            >
              <KanbanColumnHeader
                board={board}
                taskCount={allColumnTasks.length}
              />
              <Droppable droppableId={board}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="min-h-[200px] py-1.5 max-h-[calc(100vh-250px)] overflow-y-auto kanban-scroll-container"
                  >
                    {/* Render visible tasks only (Jira-style pagination) */}
                    {columnTasks.map((task: Task, index: number) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            ref={provided.innerRef}
                            className={snapshot.isDragging ? "kanban-card-dragging" : ""}
                          >
                            <KanbanCard 
                              task={task} 
                              onClick={() => {
                                setSelectedTask(task);
                                setIsDrawerOpen(true);
                              }}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    {/* Jira-style: Load More button */}
                    {hasMore && (
                      <div className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => loadMoreTasks(board)}
                        >
                          <ChevronDown className="size-4 mr-1" />
                          Load {Math.min(LOAD_MORE_BATCH, allColumnTasks.length - visibleCount)} more
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>

      {/* Task Overview Form Dialog */}
      {taskForOverview && (
        <TaskOverviewForm
          task={taskForOverview}
          isOpen={overviewFormOpen}
          onClose={() => {
            setOverviewFormOpen(false);
            setTaskForOverview(null);
            setPendingDragUpdate(null);
          }}
          onSuccess={handleOverviewSuccess}
        />
      )}

      <TaskDetailsDrawer
        task={selectedTask}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </DragDropContext>
  );
};
