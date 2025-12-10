import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Task, TaskStatus, TaskPriority } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { User, Calendar, Tag, Flag, Clock, Plus, CheckCircle2, Circle, Activity as ActivityIcon } from "lucide-react";
import { format } from "date-fns";
import { useCreateTask } from "../api/use-create-task";
import { useUpdateTask } from "../api/use-update-task";
import { useGetTasks } from "../api/use-get-tasks";
import { useGetActivityLogs } from "@/features/activity/api/use-get-activity-logs";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskDetailsDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailsDrawer({ task, open, onOpenChange }: TaskDetailsDrawerProps) {
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  
  // Fetch subtasks - filter from all tasks
  const { data: allTasksData } = useGetTasks({
    limit: 2000,
  });
  const subtasks = (allTasksData?.documents || []).filter(
    (t: any) => t.parentTaskId === task?.id
  );

  // Fetch activity logs
  const { data: activityData } = useGetActivityLogs({
    taskId: task?.id,
  });
  const activities = activityData?.documents || [];

  if (!task) return null;

  const formatDate = (date?: Date | string | null) => {
    if (!date) return "Not set";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "MMM dd, yyyy");
  };

  const PRIORITY_COLORS: Record<string, string> = {
    "Low": "bg-blue-100 text-blue-800 border-blue-200",
    "Medium": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "High": "bg-orange-100 text-orange-800 border-orange-200",
    "Critical": "bg-red-100 text-red-800 border-red-200",
  };

  const handleCreateSubtask = () => {
    if (!subtaskTitle.trim()) return;

    createTask.mutate({
      json: {
        summary: subtaskTitle,
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        parentTaskId: task.id,
        projectId: task.projectId || undefined,
        workspaceId: task.workspaceId || undefined,
      }
    }, {
      onSuccess: () => {
        setSubtaskTitle("");
      }
    });
  };

  const handleUpdateDescription = () => {
    if (!descriptionValue.trim() && !task.description) {
      setIsEditingDescription(false);
      return;
    }

    updateTask.mutate({
      json: {
        description: descriptionValue
      },
      param: { taskId: task.id }
    }, {
      onSuccess: () => {
        setIsEditingDescription(false);
      }
    });
  };

  const handleSubtaskStatusToggle = (subtask: any) => {
    const newStatus = subtask.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    updateTask.mutate({
      json: { status: newStatus },
      param: { taskId: subtask.id }
    });
  };

  const completionPercentage = subtasks.length > 0 
    ? Math.round((subtasks.filter(s => s.status === "Done").length / subtasks.length) * 100) 
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="overflow-hidden p-0 w-full sm:max-w-[95vw]"
      >
        <div className="flex h-full">
          {/* LEFT SIDE - Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-4xl">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                    ← Back
                  </Button>
                  <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">{task.issueId}</span>
                </div>
                <h1 className="text-2xl font-semibold mb-1">
                  {task.summary}
                </h1>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold mb-3">Description</h3>
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={descriptionValue}
                      onChange={(e) => setDescriptionValue(e.target.value)}
                      placeholder="Add a description..."
                      className="min-h-[120px] text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateDescription} disabled={updateTask.isPending}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingDescription(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 p-3 rounded border min-h-[80px]"
                    onClick={() => {
                      setDescriptionValue(task.description || "");
                      setIsEditingDescription(true);
                    }}
                  >
                    {task.description || "Add a description..."}
                  </div>
                )}
              </div>

              {/* Subtasks Section */}
              {subtasks.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Subtasks</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-32 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                      <span>{completionPercentage}% Done</span>
                    </div>
                  </div>
                  
                  {/* Subtasks Table */}
                  <div className="border rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-[2fr,1fr,1.5fr,1fr] gap-4 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                      <div>Work</div>
                      <div>Priority</div>
                      <div>Assignee</div>
                      <div>Status</div>
                    </div>

                    {/* Body */}
                    <div className="divide-y">
                      {subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          className="grid grid-cols-[2fr,1fr,1.5fr,1fr] gap-4 px-4 py-3 hover:bg-muted/30 transition-colors items-center"
                        >
                          {/* Work */}
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubtaskStatusToggle(subtask);
                              }}
                              className="flex-shrink-0"
                            >
                              {subtask.status === "Done" ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                              )}
                            </button>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium block mb-0.5">
                                {subtask.issueId}
                              </span>
                              <p
                                className={cn(
                                  "text-sm truncate",
                                  subtask.status === "Done" && "line-through text-muted-foreground"
                                )}
                                title={subtask.summary}
                              >
                                {subtask.summary}
                              </p>
                            </div>
                          </div>

                          {/* Priority */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-orange-500">=</span>
                            <span>{subtask.priority || 'Medium'}</span>
                          </div>

                          {/* Assignee */}
                          <div className="flex items-center gap-2 min-w-0">
                            {subtask.assignee && subtask.assignee.name ? (
                              <>
                                <MemberAvatar name={subtask.assignee.name || "Unknown"} className="size-5 flex-shrink-0" />
                                <span className="text-sm truncate">{subtask.assignee.name}</span>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-5 w-5 flex-shrink-0" />
                                <span className="text-sm">Unassigned</span>
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <div>
                            <Select
                              value={subtask.status}
                              onValueChange={(value) => {
                                updateTask.mutate({
                                  json: { status: value as TaskStatus },
                                  param: { taskId: subtask.id }
                                });
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs border-muted">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="To Do">TO DO</SelectItem>
                                <SelectItem value="In Progress">IN PROGRESS</SelectItem>
                                <SelectItem value="Done">DONE</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Section */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold mb-4">Activity</h3>
                <div className="space-y-4">
                  {activities.length > 0 ? (
                    activities.map((activity: any) => (
                      <div key={activity.id} className="flex gap-3">
                        <MemberAvatar name={activity.userName} className="size-8 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            <span className="font-medium">{activity.userName}</span>
                            {" "}
                            <span className="text-muted-foreground">{activity.summary}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(activity.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-lg">
                      No activity yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Details Panel */}
          <div className="w-[400px] overflow-y-auto bg-muted/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold">Details</h3>
              </div>

              <div className="space-y-5">
                {/* Assignee */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Assignee
                  </label>
                  {task.assignee ? (
                    <div className="flex items-center gap-3">
                      <MemberAvatar name={task.assignee.name} className="size-7" />
                      <span className="text-sm font-medium">{task.assignee.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <User className="h-7 w-7" />
                      <span className="text-sm">Unassigned</span>
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Priority
                  </label>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs font-medium px-3 py-1", PRIORITY_COLORS[task.priority || 'Medium'])}
                  >
                    {task.priority || 'None'}
                  </Badge>
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Status
                  </label>
                  <Select
                    value={task.status}
                    onValueChange={(value) => {
                      updateTask.mutate({
                        json: { status: value as TaskStatus },
                        param: { taskId: task.id }
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="To Do">TO DO</SelectItem>
                      <SelectItem value="In Progress">IN PROGRESS</SelectItem>
                      <SelectItem value="Done">DONE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Parent */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Parent
                  </label>
                  <span className="text-sm text-muted-foreground">None</span>
                </div>

                {/* Due date */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Due date
                  </label>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatDate(task.dueDate)}</span>
                  </div>
                </div>

                {/* Labels */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Labels
                  </label>
                  {task.labels && Array.isArray(task.labels) && task.labels.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {task.labels.map((label, index) => (
                        <Badge key={index} variant="outline" className="text-xs px-2 py-1">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Reporter */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Reporter
                  </label>
                  {task.reporter ? (
                    <div className="flex items-center gap-3">
                      <MemberAvatar name={task.reporter.name} className="size-7" />
                      <span className="text-sm font-medium">{task.reporter.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>

                {/* Created */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Created
                  </label>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatDate(task.created)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
