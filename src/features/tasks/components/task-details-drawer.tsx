import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Task, TaskStatus, TaskPriority, IssueType, Resolution } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { User, Calendar, Tag, Flag, Clock, Plus, CheckCircle2, Circle, Activity, UserCircle, FileText } from "lucide-react";
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
  const [isEditingEstimatedHours, setIsEditingEstimatedHours] = useState(false);
  const [estimatedHoursValue, setEstimatedHoursValue] = useState("");
  const [isEditingActualHours, setIsEditingActualHours] = useState(false);
  const [actualHoursValue, setActualHoursValue] = useState("");
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryValue, setSummaryValue] = useState("");
  const [editingCustomField, setEditingCustomField] = useState<string | null>(null);
  const [customFieldValue, setCustomFieldValue] = useState("");

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  
  // Get current user role to check if admin
  const { data: roleData, isLoading: isLoadingRole } = useGetCurrentUserRole();
  
  // Get current user from auth
  const { data: currentUser } = useCurrent();
  const currentUserId = currentUser?.id;
  
  // Fetch ALL members for assignee dropdown (not restricted by employee's project access)
  const { data: members } = useGetMembers({ 
    workspaceId: task?.workspaceId,
    forTaskAssignment: true // Get all employees for assignee dropdown
  });
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
          <div className="w-1/2 overflow-y-auto bg-background">
            <div className="p-6">
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-2 mb-4 text-sm">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onOpenChange(false)}
                  className="h-7 px-2 hover:bg-muted"
                >
                  ← Back to list
                </Button>
              </div>

              {/* Issue Header with Type Badge */}
              <div className="flex items-start gap-3 mb-6">
                {task.issueType && (
                  isAdmin ? (
                    <Select
                      value={task.issueType}
                      onValueChange={(value) => {
                        updateTask.mutate({
                          json: { issueType: value as IssueType },
                          param: { taskId: task.id }
                        });
                      }}
                    >
                      <SelectTrigger className="w-[140px] h-7 text-xs font-medium mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={IssueType.TASK}>{IssueType.TASK}</SelectItem>
                        <SelectItem value={IssueType.BUG}>{IssueType.BUG}</SelectItem>
                        <SelectItem value={IssueType.EPIC}>{IssueType.EPIC}</SelectItem>
                        <SelectItem value={IssueType.STORY}>{IssueType.STORY}</SelectItem>
                        <SelectItem value={IssueType.SUB_TASK}>{IssueType.SUB_TASK}</SelectItem>
                        <SelectItem value={IssueType.IMPROVEMENT}>{IssueType.IMPROVEMENT}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="mt-1 text-xs font-medium">
                      {task.issueType}
                    </Badge>
                  )
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-blue-600 dark:text-blue-400">
                      {task.issueId}
                    </span>
                  </div>
                  {isAdmin && isEditingSummary ? (
                    <div className="space-y-2">
                      <Input
                        value={summaryValue}
                        onChange={(e) => setSummaryValue(e.target.value)}
                        className="text-lg font-semibold h-auto py-2"
                        autoFocus
                        onBlur={() => {
                          if (summaryValue.trim() && summaryValue !== task.summary) {
                            updateTask.mutate({
                              json: { summary: summaryValue.trim() },
                              param: { taskId: task.id }
                            }, {
                              onSuccess: () => setIsEditingSummary(false)
                            });
                          } else {
                            setIsEditingSummary(false);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          } else if (e.key === 'Escape') {
                            setIsEditingSummary(false);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <h1 
                      className={cn(
                        "text-xl font-semibold text-foreground leading-tight",
                        isAdmin && "cursor-pointer hover:text-primary transition-colors"
                      )}
                      onClick={() => {
                        if (isAdmin) {
                          setSummaryValue(task.summary);
                          setIsEditingSummary(true);
                        }
                      }}
                    >
                      {task.summary}
                    </h1>
                  )}
                </div>
              </div>

              {/* Metadata Bar */}
              <div className="flex items-center gap-4 pb-4 mb-6 border-b text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Created by {task.creator?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{formatDate(task.created)}</span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-foreground mb-3">Description</h3>
                {isAdmin && isEditingDescription ? (
                  <div className="space-y-3">
                    <Textarea
                      value={descriptionValue}
                      onChange={(e) => setDescriptionValue(e.target.value)}
                      placeholder="Add a description..."
                      className="min-h-[120px] text-sm resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateDescription} disabled={updateTask.isPending}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditingDescription(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "text-sm p-4 rounded-md border bg-muted/30 min-h-[100px]",
                      isAdmin && "cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    )}
                    onClick={() => {
                      if (isAdmin) {
                        setDescriptionValue(task.description || "");
                        setIsEditingDescription(true);
                      }
                    }}
                  >
                    {task.description || (
                      <span className="text-muted-foreground italic">
                        {isAdmin ? "Click to add a description..." : "No description"}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Subtasks Section */}
              {subtasks.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Subtasks ({subtasks.filter(s => s.status === "Done").length}/{subtasks.length})
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        {completionPercentage}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Subtasks Table */}
                  <div className="border rounded-lg overflow-hidden bg-card">
                    {/* Header */}
                    <div className="grid grid-cols-[2fr,1fr,1.5fr,1fr] gap-4 px-4 py-3 bg-muted/30 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <div>Task</div>
                      <div>Priority</div>
                      <div>Assignee</div>
                      <div>Status</div>
                    </div>

                    {/* Body */}
                    <div className="divide-y">
                      {subtasks.map((subtask) => (
                        <div
                          key={subtask.id}
                          className="grid grid-cols-[2fr,1fr,1.5fr,1fr] gap-4 px-4 py-3.5 hover:bg-muted/20 transition-colors items-center"
                        >
                          {/* Work */}
                          <div className="flex items-center gap-2 min-w-0">
                            {isAdmin ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubtaskStatusToggle(subtask);
                                }}
                                className="flex-shrink-0 hover:scale-110 transition-transform"
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
                            {isAdmin ? (
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
          <div className="w-1/2 overflow-y-auto bg-muted/10 border-l">
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Details</h3>
              </div>

              <div className="space-y-4">
                {/* Assignee */}
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
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
                      <SelectTrigger className="h-10 text-sm font-medium border-0 bg-muted/50 hover:bg-muted">
                        <SelectValue>
                          {task.assignee ? (
                            <div className="flex items-center gap-2.5">
                              <MemberAvatar name={task.assignee.name} className="size-6" />
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
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3 flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5" />
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
                      <SelectTrigger className="h-10 text-sm font-medium border-0 bg-muted/50 hover:bg-muted">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">Low</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="Medium">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">Medium</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="High">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-orange-500 text-orange-700 bg-orange-50">High</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="Critical">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-red-500 text-red-700 bg-red-50">Critical</Badge>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge 
                      variant="outline" 
                      className={`text-sm font-medium ${
                        task.priority === "Critical" ? "border-red-500 text-red-700 bg-red-50" :
                        task.priority === "High" ? "border-orange-500 text-orange-700 bg-orange-50" :
                        task.priority === "Low" ? "border-blue-500 text-blue-700 bg-blue-50" :
                        "border-yellow-500 text-yellow-700 bg-yellow-50"
                      }`}
                    >
                      {task.priority || "Medium"}
                    </Badge>
                  )}
                </div>

                {/* Status */}
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
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
                      <SelectTrigger className="h-10 text-sm font-medium border-0 bg-muted/50 hover:bg-muted">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="To Do">
                          <Badge variant="outline" className="border-gray-500 text-gray-700 bg-gray-50">TO DO</Badge>
                        </SelectItem>
                        <SelectItem value="In Progress">
                          <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">IN PROGRESS</Badge>
                        </SelectItem>
                        <SelectItem value="Done">
                          <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">DONE</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge 
                      variant="outline" 
                      className={`text-sm font-medium ${
                        task.status === "Done" ? "border-green-500 text-green-700 bg-green-50" :
                        task.status === "In Progress" ? "border-blue-500 text-blue-700 bg-blue-50" :
                        "border-gray-500 text-gray-700 bg-gray-50"
                      }`}
                    >
                      {task.status}
                    </Badge>
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
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Due date
                  </label>
                  {isAdmin && isEditingDueDate ? (
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={dueDateValue}
                        onChange={(e) => setDueDateValue(e.target.value)}
                        className="h-10 text-sm border-0 bg-muted/50"
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
                        "flex items-center gap-3 text-sm p-2.5 rounded-md border-0",
                        isAdmin && "cursor-pointer hover:bg-muted/50 bg-muted/20"
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
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    Labels
                  </label>
                  {isAdmin ? (
                    isEditingLabels ? (
                      <div className="space-y-2">
                        <Input
                          value={labelsValue}
                          onChange={(e) => setLabelsValue(e.target.value)}
                          placeholder="Enter labels separated by commas"
                          className="text-sm border-0 bg-muted/50"
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
                        className="cursor-pointer hover:bg-muted/50 rounded-md p-2.5 -ml-2.5 border-0 bg-muted/20"
                        onClick={() => {
                          const currentLabels = task.labels && Array.isArray(task.labels) ? task.labels.join(', ') : '';
                          setLabelsValue(currentLabels);
                          setIsEditingLabels(true);
                        }}
                      >
                        {task.labels && Array.isArray(task.labels) && task.labels.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {task.labels.map((label, index) => (
                              <Badge key={index} variant="secondary" className="text-xs px-2.5 py-1">
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

                <Separator className="my-2" />

                {/* Reporter */}
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3 flex items-center gap-1.5">
                    <UserCircle className="h-3.5 w-3.5" />
                    Reporter
                  </label>
                  {task.reporter ? (
                    <div className="flex items-center gap-3">
                      <MemberAvatar name={task.reporter.name} className="size-8" />
                      <span className="text-sm font-medium">{task.reporter.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>

                {/* Created */}
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Created
                  </label>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{formatDate(task.created)}</span>
                  </div>
                </div>

                {/* Custom Fields - Show all additional fields from CSV imports */}
                {task.customFields && typeof task.customFields === 'object' && Object.keys(task.customFields).length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <div className="bg-card rounded-lg p-4 border shadow-sm">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Additional Details
                      </label>
                      <div className="space-y-3">
                        {Object.entries(task.customFields as Record<string, any>).map(([key, value]) => (
                          <div key={key} className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            {isAdmin && editingCustomField === key ? (
                              <div className="flex gap-2">
                                <Input
                                  value={customFieldValue}
                                  onChange={(e) => setCustomFieldValue(e.target.value)}
                                  className="h-8 text-sm"
                                  autoFocus
                                  onBlur={() => {
                                    const customFields = { ...(task.customFields as Record<string, any>) };
                                    customFields[key] = customFieldValue;
                                    updateTask.mutate({
                                      json: { customFields },
                                      param: { taskId: task.id }
                                    }, {
                                      onSuccess: () => {
                                        setEditingCustomField(null);
                                        setCustomFieldValue("");
                                      }
                                    });
                                  }}
                                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                    } else if (e.key === 'Escape') {
                                      setEditingCustomField(null);
                                      setCustomFieldValue("");
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <span 
                                className={cn(
                                  "text-sm p-2 rounded",
                                  isAdmin && "cursor-pointer hover:bg-muted/50"
                                )}
                                onClick={() => {
                                  if (isAdmin) {
                                    setEditingCustomField(key);
                                    setCustomFieldValue(value !== null && value !== undefined && value !== '' ? String(value) : '');
                                  }
                                }}
                              >
                                {value !== null && value !== undefined && value !== '' ? String(value) : '-'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator className="my-4" />
                
                {/* Resolution */}
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3">
                    Resolution
                  </label>
                  {isAdmin ? (
                    <Select
                      value={task.resolution || "none"}
                      onValueChange={(value) => {
                        updateTask.mutate({
                          json: { resolution: value === "none" ? undefined : (value as Resolution) },
                          param: { taskId: task.id }
                        });
                      }}
                    >
                      <SelectTrigger className="h-10 text-sm font-medium border-0 bg-muted/50 hover:bg-muted">
                        <SelectValue>
                          {task.resolution ? (
                            <Badge variant="outline" className="text-xs">{task.resolution}</Badge>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value={Resolution.DONE}>{Resolution.DONE}</SelectItem>
                        <SelectItem value={Resolution.FIXED}>{Resolution.FIXED}</SelectItem>
                        <SelectItem value={Resolution.WONT_FIX}>{Resolution.WONT_FIX}</SelectItem>
                        <SelectItem value={Resolution.DUPLICATE}>{Resolution.DUPLICATE}</SelectItem>
                        <SelectItem value={Resolution.CANNOT_REPRODUCE}>{Resolution.CANNOT_REPRODUCE}</SelectItem>
                        <SelectItem value={Resolution.INCOMPLETE}>{Resolution.INCOMPLETE}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    task.resolution ? (
                      <Badge variant="outline" className="text-xs px-2 py-1">{task.resolution}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )
                  )}
                </div>

                {/* Estimated Hours */}
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Estimated Hours
                  </label>
                  {isAdmin && isEditingEstimatedHours ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={estimatedHoursValue}
                        onChange={(e) => setEstimatedHoursValue(e.target.value)}
                        className="h-10 text-sm border-0 bg-muted/50"
                        placeholder="Enter hours"
                        autoFocus
                        onBlur={() => {
                          const hours = parseFloat(estimatedHoursValue);
                          if (!isNaN(hours) && hours >= 0) {
                            updateTask.mutate({
                              json: { estimatedHours: hours },
                              param: { taskId: task.id }
                            }, {
                              onSuccess: () => setIsEditingEstimatedHours(false)
                            });
                          } else {
                            setIsEditingEstimatedHours(false);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex items-center gap-3 text-sm p-2.5 rounded-md border-0",
                        isAdmin && "cursor-pointer hover:bg-muted/50 bg-muted/20"
                      )}
                      onClick={() => {
                        if (isAdmin) {
                          setEstimatedHoursValue(task.estimatedHours?.toString() || "");
                          setIsEditingEstimatedHours(true);
                        }
                      }}
                    >
                      <span className="font-medium">{task.estimatedHours ? `${task.estimatedHours}h` : "Not set"}</span>
                    </div>
                  )}
                </div>

                {/* Actual Hours */}
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Actual Hours
                  </label>
                  {isAdmin && isEditingActualHours ? (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={actualHoursValue}
                        onChange={(e) => setActualHoursValue(e.target.value)}
                        className="h-10 text-sm border-0 bg-muted/50"
                        placeholder="Enter hours"
                        autoFocus
                        onBlur={() => {
                          const hours = parseFloat(actualHoursValue);
                          if (!isNaN(hours) && hours >= 0) {
                            updateTask.mutate({
                              json: { actualHours: hours },
                              param: { taskId: task.id }
                            }, {
                              onSuccess: () => setIsEditingActualHours(false)
                            });
                          } else {
                            setIsEditingActualHours(false);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex items-center gap-3 text-sm p-2.5 rounded-md border-0",
                        isAdmin && "cursor-pointer hover:bg-muted/50 bg-muted/20"
                      )}
                      onClick={() => {
                        if (isAdmin) {
                          setActualHoursValue(task.actualHours?.toString() || "0");
                          setIsEditingActualHours(true);
                        }
                      }}
                    >
                      <span className="font-medium">{task.actualHours ? `${task.actualHours}h` : "0h"}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
