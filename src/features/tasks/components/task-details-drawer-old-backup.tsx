import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Task } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { User, Calendar, Tag, Flag, FileText, Link2, Clock, Plus, CheckCircle2, Circle, MessageSquare, Activity } from "lucide-react";
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
  
  // Fetch subtasks
  const { data: subtasksData } = useGetTasks({
    parentTaskId: task?.id,
  });
  const subtasks = subtasksData?.documents || [];

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
        status: "To Do",
        priority: "Medium",
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
    const newStatus = subtask.status === "Done" ? "To Do" : "Done";
    updateTask.mutate({
      json: { status: newStatus },
      param: { taskId: subtask.id }
    });
  };

  const hasSubtasks = subtasks.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="overflow-hidden p-0 w-full sm:max-w-[95vw]"
      >
        {/* ======= JIRA-STYLE LAYOUT ======= */}
        <div className="flex h-full">
          {/* LEFT SIDE - Main Content (Description, Subtasks, Activity) */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-4xl">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">{task.issueId}</span>
                </div>
                <h1 className="text-2xl font-semibold mb-4">
                  {task.summary}
                </h1>
              </div>

              {/* Description Section */}
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
                              className="size-6" />
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
                      <div className="space-y-4 max-h-[300px] overflow-y-auto">
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

                        <div className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-lg">
                          Comments feature coming soon
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE - Subtasks list */}
            <div className="w-[45%] overflow-y-auto bg-muted/20">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Subtasks</h3>
                    <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ 
                          width: `${subtasks.length > 0 ? (subtasks.filter(s => s.status === "Done").length / subtasks.length) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {subtasks.filter(s => s.status === "Done").length}% Done
                    </p>
                  </div>
                </div>
                
                {/* Subtask Creation Input */}
                <div className="flex gap-2 mb-6">
                  <Input
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    placeholder="Add a subtask..."
                    className="h-9 text-sm bg-background"
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

                {/* Subtasks Table */}
                <div className="border rounded-lg bg-background overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-[2fr,1fr,1.5fr,1fr] gap-4 px-4 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                    <div>Work</div>
                    <div>Priority</div>
                    <div>Assignee</div>
                    <div>Status</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y">
                    {subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="grid grid-cols-[2fr,1fr,1.5fr,1fr] gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer items-center"
                      >
                        {/* Work Column */}
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
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                {subtask.issueId}
                              </span>
                            </div>
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

                        {/* Priority Column */}
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-orange-500">=</span>
                          <span>{subtask.priority || 'Medium'}</span>
                        </div>

                        {/* Assignee Column */}
                        <div className="flex items-center gap-2">
                          {subtask.assignee ? (
                            <>
                              <MemberAvatar name={subtask.assignee.name} className="size-5" />
                              <span className="text-sm truncate">{subtask.assignee.name}</span>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-5 w-5" />
                              <span className="text-sm">Unassigned</span>
                            </div>
                          )}
                        </div>

                        {/* Status Column */}
                        <div>
                          <select
                            value={subtask.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateTask.mutate({
                                json: { status: e.target.value },
                                param: { taskId: subtask.id }
                              });
                            }}
                            className="text-xs px-2 py-1 rounded border bg-background hover:bg-muted cursor-pointer w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="To Do">TO DO</option>
                            <option value="In Progress">IN PROGRESS</option>
                            <option value="Done">DONE</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {subtasks.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No subtasks yet. Add one above to get started.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ======= SINGLE COLUMN VIEW FOR TASKS WITHOUT SUBTASKS ======= */
          <div className="p-6 overflow-y-auto h-full">
            <SheetHeader className="space-y-4 mb-6">
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

            <div className="space-y-6">
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
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 w-4 rounded-full bg-blue-100" />
                    <span className="text-xs font-medium text-muted-foreground">Status</span>
                  </div>
                  <div className="pl-6">
                    <Badge variant="secondary" className="text-xs">{task.status}</Badge>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Flag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Priority</span>
                  </div>
                  <div className="pl-6">
                    <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[task.priority || 'Medium']}`}>
                      {task.priority || 'Medium'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Assignee</span>
                  </div>
                  <div className="pl-6 flex items-center gap-2">
                    {task.assignee ? (
                      <>
                        <MemberAvatar name={task.assignee.name} className="size-6" />
                        <span className="text-sm">{task.assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Reporter</span>
                  </div>
                  <div className="pl-6 flex items-center gap-2">
                    {task.reporter ? (
                      <>
                        <MemberAvatar name={task.reporter.name} className="size-6" />
                        <span className="text-sm">{task.reporter.name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Due Date</span>
                  </div>
                  <div className="pl-6">
                    <span className="text-sm">{formatDate(task.dueDate)}</span>
                  </div>
                </div>

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

              {/* Subtask Creation */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium mb-4">Subtasks</h3>
                <div className="flex gap-2">
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
              </div>

              {/* Activity */}
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

                {activeTab === "comments" && (
                  <div className="space-y-4">
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

                    <div className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-lg">
                      Comments feature coming soon
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
