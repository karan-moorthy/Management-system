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
import { useGetCurrentUserRole } from "@/features/members/api/use-get-user-role";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useCurrent } from "@/features/auth/api/use-current";
import { MemberRole } from "@/features/members/types";
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
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [dueDateValue, setDueDateValue] = useState("");
  const [isEditingLabels, setIsEditingLabels] = useState(false);
  const [labelsValue, setLabelsValue] = useState("");

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  
  // Get current user role to check if admin
  const { data: roleData, isLoading: isLoadingRole } = useGetCurrentUserRole();
  
  // Get current user from auth
  const { data: currentUser } = useCurrent();
  const currentUserId = currentUser?.id;
  
  // Fetch members for assignee dropdown
  const { data: members } = useGetMembers({ workspaceId: task?.workspaceId });
  // Only ADMIN and PROJECT_MANAGER can edit task details
  // Employees have view-only access (except Kanban drag-drop which is handled separately)
  const isAdmin = roleData && [MemberRole.ADMIN, MemberRole.PROJECT_MANAGER].includes(roleData.role as MemberRole);
  
  // Debug log
  console.log('Task Details Drawer - Role Check:', { 
    roleData, 
    isAdmin, 
    isLoadingRole,
    taskId: task?.id 
  });
  
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
          <div className="w-1/2 overflow-y-auto">
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
                {isAdmin && isEditingDescription ? (
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
                    className={cn(
                      "text-sm text-muted-foreground p-3 rounded border min-h-[80px]",
                      isAdmin && "cursor-pointer hover:bg-muted/50"
                    )}
                    onClick={() => {
                      if (isAdmin) {
                        setDescriptionValue(task.description || "");
                        setIsEditingDescription(true);
                      }
                    }}
                  >
                    {task.description || (isAdmin ? "Add a description..." : "No description")}
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
                            {(isAdmin || subtask.assigneeId === currentUserId) ? (
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
                            ) : (
                              <div className="flex-shrink-0">
                                {subtask.status === "Done" ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            <div 
                              className="min-w-0 flex-1 cursor-pointer"
                              onClick={() => {
                                // Open the subtask in the details drawer
                                onOpenChange(false); // Close current drawer first
                                setTimeout(() => {
                                  // Small delay to allow smooth transition
                                  window.dispatchEvent(new CustomEvent('openTaskDetails', { 
                                    detail: { task: subtask } 
                                  }));
                                }, 100);
                              }}
                            >
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium block mb-0.5 hover:underline">
                                {subtask.issueId}
                              </span>
                              <p
                                className={cn(
                                  "text-sm truncate hover:text-primary",
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
                            {isAdmin ? (
                              <Select
                                value={subtask.priority || "Medium"}
                                onValueChange={(value) => {
                                  updateTask.mutate({
                                    json: { priority: value as TaskPriority },
                                    param: { taskId: subtask.id }
                                  });
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs border-muted">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Low">Low</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="High">High</SelectItem>
                                  <SelectItem value="Critical">Critical</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-orange-500">=</span>
                                <span>{subtask.priority || 'Medium'}</span>
                              </div>
                            )}
                          </div>

                          {/* Assignee */}
                          <div className="flex items-center gap-2 min-w-0">
                            {isAdmin ? (
                              <Select
                                value={subtask.assigneeId || "unassigned"}
                                onValueChange={(value) => {
                                  updateTask.mutate({
                                    json: { assigneeId: value === "unassigned" ? undefined : value },
                                    param: { taskId: subtask.id }
                                  });
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs border-muted">
                                  <SelectValue>
                                    {subtask.assignee && subtask.assignee.name ? (
                                      <div className="flex items-center gap-2">
                                        <MemberAvatar name={subtask.assignee.name} className="size-4" />
                                        <span className="truncate">{subtask.assignee.name}</span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">Unassigned</span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      <span>Unassigned</span>
                                    </div>
                                  </SelectItem>
                                  {members?.documents?.map((member: any) => (
                                    <SelectItem key={member.userId} value={member.userId}>
                                      <div className="flex items-center gap-2">
                                        <MemberAvatar name={member.name} className="size-4" />
                                        <span>{member.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              subtask.assignee && subtask.assignee.name ? (
                                <>
                                  <MemberAvatar name={subtask.assignee.name || "Unknown"} className="size-5 flex-shrink-0" />
                                  <span className="text-sm truncate">{subtask.assignee.name}</span>
                                </>
                              ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <User className="h-5 w-5 flex-shrink-0" />
                                  <span className="text-sm">Unassigned</span>
                                </div>
                              )
                            )}
                          </div>

                          {/* Status */}
                          <div>
                            {isAdmin || subtask.assigneeId === currentUserId ? (
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
                            ) : (
                              <div className="h-7 px-2 py-1 text-xs border rounded flex items-center">
                                {subtask.status}
                              </div>
                            )}
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
          <div className="w-1/2 overflow-y-auto bg-muted/20">
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
                  {isAdmin ? (
                    <Select
                      value={task.assigneeId || "unassigned"}
                      onValueChange={(value) => {
                        updateTask.mutate({
                          json: { assigneeId: value === "unassigned" ? undefined : value },
                          param: { taskId: task.id }
                        });
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm font-medium">
                        <SelectValue>
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
                              <MemberAvatar name={task.assignee.name} className="size-5" />
                              <span>{task.assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Unassigned</span>
                          </div>
                        </SelectItem>
                        {members?.documents?.map((member: any) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            <div className="flex items-center gap-2">
                              <MemberAvatar name={member.name} className="size-4" />
                              <span>{member.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    task.assignee ? (
                      <div className="flex items-center gap-3">
                        <MemberAvatar name={task.assignee.name} className="size-7" />
                        <span className="text-sm font-medium">{task.assignee.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <User className="h-7 w-7" />
                        <span className="text-sm">Unassigned</span>
                      </div>
                    )
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Priority
                  </label>
                  {isAdmin ? (
                    <Select
                      value={task.priority || "Medium"}
                      onValueChange={(value) => {
                        updateTask.mutate({
                          json: { priority: value as TaskPriority },
                          param: { taskId: task.id }
                        });
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm font-medium">{task.priority || "Medium"}</div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Status
                  </label>
                  {isAdmin ? (
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
                  ) : (
                    <div className="text-sm font-medium">{task.status}</div>
                  )}
                </div>

                {/* Parent */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Parent
                  </label>
                  {task.parentTaskId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-blue-600">
                        {/* Find parent task from all tasks */}
                        {(() => {
                          const parentTask = (allTasksData?.documents || []).find(
                            (t: any) => t.id === task.parentTaskId
                          );
                          return parentTask ? (
                            <button
                              onClick={() => {
                                // Dispatch custom event to open parent task details
                                window.dispatchEvent(new CustomEvent('openTaskDetails', {
                                  detail: { taskId: task.parentTaskId }
                                }));
                              }}
                              className="hover:underline cursor-pointer text-blue-600"
                            >
                              {parentTask.issueId} - {parentTask.summary}
                            </button>
                          ) : (
                            <span className="text-sm text-muted-foreground">Parent task not found</span>
                          );
                        })()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>

                {/* Due date */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Due date
                  </label>
                  {isAdmin && isEditingDueDate ? (
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={dueDateValue}
                        onChange={(e) => setDueDateValue(e.target.value)}
                        className="h-9 text-sm"
                        autoFocus
                        onBlur={() => {
                          if (dueDateValue) {
                            updateTask.mutate({
                              json: { dueDate: new Date(dueDateValue) as any },
                              param: { taskId: task.id }
                            }, {
                              onSuccess: () => setIsEditingDueDate(false)
                            });
                          } else {
                            setIsEditingDueDate(false);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div 
                      className={cn(
                        "flex items-center gap-3 text-sm p-2 rounded",
                        isAdmin && "cursor-pointer hover:bg-accent"
                      )}
                      onClick={() => {
                        if (isAdmin) {
                          const dateStr = task.dueDate 
                            ? new Date(task.dueDate).toISOString().split('T')[0] 
                            : new Date().toISOString().split('T')[0];
                          setDueDateValue(dateStr);
                          setIsEditingDueDate(true);
                        }
                      }}
                    >
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatDate(task.dueDate)}</span>
                    </div>
                  )}
                </div>

                {/* Labels */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Labels
                  </label>
                  {isAdmin ? (
                    isEditingLabels ? (
                      <div className="space-y-2">
                        <Input
                          value={labelsValue}
                          onChange={(e) => setLabelsValue(e.target.value)}
                          placeholder="Enter labels separated by commas"
                          className="text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              const labelsArray = labelsValue.split(',').map(l => l.trim()).filter(l => l);
                              updateTask.mutate({
                                json: { labels: labelsArray },
                                param: { taskId: task.id }
                              });
                              setIsEditingLabels(false);
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingLabels(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="cursor-pointer hover:bg-muted/50 rounded p-2 -ml-2"
                        onClick={() => {
                          const currentLabels = task.labels && Array.isArray(task.labels) ? task.labels.join(', ') : '';
                          setLabelsValue(currentLabels);
                          setIsEditingLabels(true);
                        }}
                      >
                        {task.labels && Array.isArray(task.labels) && task.labels.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {task.labels.map((label, index) => (
                              <Badge key={index} variant="outline" className="text-xs px-2 py-1">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">None (Click to add)</span>
                        )}
                      </div>
                    )
                  ) : (
                    // Read-only view for non-admins
                    task.labels && Array.isArray(task.labels) && task.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {task.labels.map((label, index) => (
                          <Badge key={index} variant="outline" className="text-xs px-2 py-1">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )
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
