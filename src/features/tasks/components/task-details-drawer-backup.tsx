import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Task, TaskStatus, TaskPriority, IssueType } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { X, User, Calendar, Tag, Flag, FileText, Link2, Clock, Plus, CheckCircle2, Circle, MessageSquare, Activity } from "lucide-react";
import { format } from "date-fns";
import { useCreateTask } from "../api/use-create-task";
import { useUpdateTask } from "../api/use-update-task";
import { useGetTasks } from "../api/use-get-tasks";
import { useGetActivityLogs } from "@/features/activity/api/use-get-activity-logs";
import { cn } from "@/lib/utils";

interface TaskDetailsDrawerProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailsDrawer({ task, open, onOpenChange }: TaskDetailsDrawerProps) {
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState("");
  const [commentText, setCommentText] = useState("");
  const [activeTab, setActiveTab] = useState<"activity" | "comments">("activity");

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const workspaceId = task?.workspaceId || "";
  
  // Fetch subtasks - parentTaskId filter not supported, will need custom implementation
  const { data: subtasksData } = useGetTasks({
    workspaceId,
  });
  const subtasks = subtasksData?.documents?.filter(t => t.parentTaskId === task?.id) || [];

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

  const handleSubtaskStatusToggle = (subtask: Task) => {
    const newStatus = subtask.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
    updateTask.mutate({
      json: { status: newStatus },
      param: { taskId: subtask.id }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <span>{task.issueId}</span>
                <span>•</span>
                <Badge variant="outline" className="text-xs">
                  {task.issueType}
                </Badge>
              </div>
              <SheetTitle className="text-xl font-semibold pr-8">
                {task.summary}
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Description</h3>
              </div>
              {!isEditingDescription && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDescriptionValue(task.description || "");
                    setIsEditingDescription(true);
                  }}
                  className="h-7 text-xs"
                >
                  Edit
                </Button>
              )}
            </div>
            <div className="pl-6">
              {isEditingDescription ? (
                <div className="space-y-2">
                  <Textarea
                    value={descriptionValue}
                    onChange={(e) => setDescriptionValue(e.target.value)}
                    placeholder="Add a description..."
                    className="min-h-[100px] text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleUpdateDescription}
                      disabled={updateTask.isPending}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingDescription(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 p-2 rounded min-h-[60px]"
                  onClick={() => {
                    setDescriptionValue(task.description || "");
                    setIsEditingDescription(true);
                  }}
                >
                  {task.description || "Click to add description..."}
                </div>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-4 rounded-full bg-blue-100" />
                <span className="text-xs font-medium text-muted-foreground">Status</span>
              </div>
              <div className="pl-6">
                <Badge variant="secondary" className="text-xs">
                  {task.status}
                </Badge>
              </div>
            </div>

            {/* Priority */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flag className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Priority</span>
              </div>
              <div className="pl-6">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${PRIORITY_COLORS[task.priority || 'Medium']}`}
                >
                  {task.priority || 'Medium'}
                </Badge>
              </div>
            </div>

            {/* Assignee */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Assignee</span>
              </div>
              <div className="pl-6 flex items-center gap-2">
                {task.assignee ? (
                  <>
                    <MemberAvatar 
                      name={task.assignee.name} 
                      className="size-6" 
                    />
                    <span className="text-sm">{task.assignee.name}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </div>
            </div>

            {/* Reporter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Reporter</span>
              </div>
              <div className="pl-6 flex items-center gap-2">
                {task.reporter ? (
                  <>
                    <MemberAvatar 
                      name={task.reporter.name} 
                      className="size-6" 
                    />
                    <span className="text-sm">{task.reporter.name}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Due Date</span>
              </div>
              <div className="pl-6">
                <span className="text-sm">{formatDate(task.dueDate)}</span>
              </div>
            </div>

            {/* Created */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Created</span>
              </div>
              <div className="pl-6">
                <span className="text-sm">{formatDate(task.created)}</span>
              </div>
            </div>
          </div>

          {/* Labels */}
          {task.labels && Array.isArray(task.labels) && task.labels.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-medium text-muted-foreground">Labels</h3>
              </div>
              <div className="pl-6 flex flex-wrap gap-2">
                {task.labels.map((label, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Project */}
          {task.project && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-medium text-muted-foreground">Project</h3>
              </div>
              <div className="pl-6 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {task.project.name}
                </Badge>
              </div>
            </div>
          )}

          {/* Subtasks Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Subtasks</h3>
              <span className="text-xs text-muted-foreground">
                {subtasks.filter(s => s.status === "Done").length} of {subtasks.length}
              </span>
            </div>
            
            {/* Subtask Creation Input */}
            <div className="flex gap-2 mb-4">
              <Input
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                placeholder="Add a subtask..."
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateSubtask();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleCreateSubtask}
                disabled={!subtaskTitle.trim() || createTask.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Subtasks List */}
            {subtasks.length > 0 ? (
              <div className="space-y-2">
                {subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors group"
                  >
                    <button
                      onClick={() => handleSubtaskStatusToggle(subtask as Task)}
                      className="flex-shrink-0"
                    >
                      {subtask.status === TaskStatus.DONE ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "text-sm",
                          subtask.status === TaskStatus.DONE && "line-through text-muted-foreground"
                        )}
                      >
                        {subtask.summary}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {subtask.issueId}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-lg">
                No subtasks yet. Add one above to get started.
              </div>
            )}
          </div>

          {/* Activity & Comments Section */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-4 mb-4 border-b">
              <button
                onClick={() => setActiveTab("activity")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "activity"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Activity className="h-4 w-4" />
                Activity
                <Badge variant="secondary" className="text-xs">
                  {activities.length}
                </Badge>
              </button>
              <button
                onClick={() => setActiveTab("comments")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "comments"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="h-4 w-4" />
                Comments
              </button>
            </div>

            {/* Activity Tab */}
            {activeTab === "activity" && (
              <div className="space-y-4">
                {activities.length > 0 ? (
                  activities.map((activity: any) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex-shrink-0">
                        <MemberAvatar name={activity.userName} className="size-8" />
                      </div>
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
            )}

            {/* Comments Tab */}
            {activeTab === "comments" && (
              <div className="space-y-4">
                {/* Comment Input */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <MemberAvatar name="You" className="size-8" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="min-h-[80px] text-sm"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={!commentText.trim()}
                        onClick={() => {
                          // TODO: Implement comment creation
                          console.log("Comment:", commentText);
                          setCommentText("");
                        }}
                      >
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Comments List - Placeholder */}
                <div className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-lg">
                  Comments feature coming soon
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
