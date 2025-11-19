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

      let updatesPayload: {
        id: string;
        status: TaskStatus;
        position: number;
      }[] = [];

      setTasks((prevTasks) => {
        const newTasks = { ...prevTasks };

        // Safely remove the task from the source column
        const sourceColumn = [...newTasks[sourceStatus]];
        const [movedTask] = sourceColumn.splice(source.index, 1);

        // If there's no moved task (shouldn't happen, but just in case), return the previous state
        if (!movedTask) {
          console.error("No task found at the source index");
          return prevTasks;
        }

        // Create a new task object with potentially updated status
        const updatedMovedTask =
          sourceStatus !== destStatus
            ? { ...movedTask, status: destStatus }
            : movedTask;

        // Update the source column
        newTasks[sourceStatus] = sourceColumn;

        // Add the task to the destination column
        const destColumn = [...newTasks[destStatus]];
        destColumn.splice(destination.index, 0, updatedMovedTask);
        newTasks[destStatus] = destColumn;

        // Prepare minimal update payloads
        updatesPayload = [];

        // Always update the moved task
        updatesPayload.push({
          id: updatedMovedTask.id,
          status: destStatus,
          position: Math.min((destination.index + 1) * 1000, 1_000_000),
        });

        // Update positions for affected tasks in the destination column
        newTasks[destStatus].forEach((task, index) => {
          if (task && task.id !== updatedMovedTask.id) {
            const newPosition = Math.min((index + 1) * 1000, 1_000_000);
            if (task.position !== newPosition) {
              updatesPayload.push({
                id: task.id,
                status: destStatus,
                position: newPosition,
              });
            }
          }
        });

        // If the task moved between columns, update positions in the source column
        if (sourceStatus !== destStatus) {
          newTasks[sourceStatus].forEach((task, index) => {
            if (task) {
              const newPosition = Math.min((index + 1) * 1000, 1_000_000);
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

        return newTasks;
      });

      onChange(updatesPayload);
    },
    [onChange]
  );

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
    </DragDropContext>
  );
};
