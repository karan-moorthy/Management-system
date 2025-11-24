import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { FixedSizeList as List } from "react-window";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

import { KanbanCard } from "./kanban-card";
import { KanbanColumnHeader } from "./kanban-column-header";
import { TaskOverviewForm } from "./task-overview-form";

import { Task, TaskStatus } from "../types";
import "./kanban-optimizations.css";

const boards: TaskStatus[] = [
  TaskStatus.BACKLOG,
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

      // PREVENT: Don't allow moving approved tasks out of Done status
      if (sourceStatus === TaskStatus.DONE && destStatus !== TaskStatus.DONE) {
        alert("Approved tasks cannot be moved out of Done. Please contact an admin if changes are needed.");
        return;
      }

      // INTERCEPT: If moving to In Review or Done from any other status, open overview form
      // After submission, task will move to IN_REVIEW for admin review
      if ((destStatus === TaskStatus.IN_REVIEW || destStatus === TaskStatus.DONE) && 
          sourceStatus !== TaskStatus.IN_REVIEW && 
          sourceStatus !== TaskStatus.DONE) {
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
    
    if (pendingDragUpdate) {
      console.log("🔄 Applying pending drag update to move task to IN_REVIEW");
      // Apply the pending drag update (task moves to IN_REVIEW)
      onChange(pendingDragUpdate.updates);
      
      // Update local state to reflect the move to IN_REVIEW
      setTasks((prevTasks) => {
        const newTasks = { ...prevTasks };
        
        if (!taskForOverview) return prevTasks;
        
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
      
      setPendingDragUpdate(null);
    } else {
      console.warn("⚠️ No pending drag update found!");
    }
    setTaskForOverview(null);
  }, [pendingDragUpdate, taskForOverview, onChange]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex overflow-x-auto kanban-horizontal-scroll kanban-board-container">
        {boards.map((board) => {
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
                    {columnTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            ref={provided.innerRef}
                            className={snapshot.isDragging ? "kanban-card-dragging" : ""}
                          >
                            <KanbanCard task={task} />
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
    </DragDropContext>
  );
};
