import { MoreHorizontalIcon, TagIcon, UserIcon, CalendarIcon, Clock, CheckCircleIcon } from "lucide-react";

import { DottedSeparator } from "@/components/dotted-separator";
import { Badge } from "@/components/ui/badge";

import { MemberAvatar } from "@/features/members/components/member-avatar";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";

import { TaskActions } from "./task-actions";
import { TaskDate } from "./task-date";

import { Task } from "../types";

interface KanbanCardProps {
  task: Task;
}

export const KanbanCard = ({ task }: KanbanCardProps) => {
  // Helper function to format date and time
  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper function to determine due date status
  const getDueDateStatus = (dueDate: string | undefined) => {
    if (!dueDate) return 'normal';
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 1) return 'urgent';
    if (diffDays <= 3) return 'soon';
    return 'normal';
  };

  // Parse labels from JSON string
  const labels = task.labels ? (Array.isArray(task.labels) ? task.labels : JSON.parse(task.labels || '[]')) : [];
  const dueDateStatus = getDueDateStatus(task.dueDate);

  const getCardClassName = () => {
    let baseClass = "bg-card p-3 mb-2 rounded-lg shadow-sm border space-y-3 hover:shadow-md transition-shadow";
    
    if (dueDateStatus === 'overdue') {
      return `${baseClass} border-red-500/50 bg-red-50 dark:bg-red-950/30`;
    } else if (dueDateStatus === 'urgent') {
      return `${baseClass} border-orange-500/50 bg-orange-50 dark:bg-orange-950/30`;
    } else if (dueDateStatus === 'soon') {
      return `${baseClass} border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30`;
    }
    return `${baseClass} border-border`;
  };

  const getDueDateClassName = () => {
    if (dueDateStatus === 'overdue') {
      return 'flex items-center gap-x-1.5 text-xs text-red-600 dark:text-red-400 font-medium';
    } else if (dueDateStatus === 'urgent') {
      return 'flex items-center gap-x-1.5 text-xs text-orange-600 dark:text-orange-400 font-medium';
    } else if (dueDateStatus === 'soon') {
      return 'flex items-center gap-x-1.5 text-xs text-yellow-600 dark:text-yellow-400 font-medium';
    }
    return 'flex items-center gap-x-1.5 text-xs text-muted-foreground';
  };

  const getIconClassName = () => {
    if (dueDateStatus === 'overdue') {
      return 'size-3 text-red-500 dark:text-red-400';
    } else if (dueDateStatus === 'urgent') {
      return 'size-3 text-orange-500 dark:text-orange-400';
    } else if (dueDateStatus === 'soon') {
      return 'size-3 text-yellow-500 dark:text-yellow-400';
    }
    return 'size-3 text-muted-foreground';
  };

  return (
    <div className={getCardClassName()}>
      {/* Header with Issue ID, Priority, and Actions */}
      <div className="flex items-start justify-between gap-x-2">
        <div className="flex items-center gap-x-2">
          <Badge variant="outline" className="text-xs font-mono px-1.5 py-0.5">
            {task.issueId}
          </Badge>
          <Badge 
            variant={task.priority === 'High' || task.priority === 'Critical' ? 'destructive' : 'secondary'}
            className="text-xs px-1.5 py-0.5"
          >
            {task.priority}
          </Badge>
        </div>
        <TaskActions id={task.id} projectId={task.projectId || ""} assigneeId={task.assigneeId}>
          <MoreHorizontalIcon className="size-[18px] stroke-1 shrink-0 text-muted-foreground hover:opacity-75 transition" />
        </TaskActions>
      </div>

      {/* Project Name Badge */}
      {task.projectName && (
        <div className="flex items-center gap-x-1">
          <Badge variant="outline" className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
            {task.projectName}
          </Badge>
        </div>
      )}

      {/* Task Title */}
      <p className="text-sm font-medium leading-relaxed text-foreground">{task.summary}</p>

      {/* Labels */}
      {labels.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <TagIcon className="size-3 text-muted-foreground" />
          <div className="flex gap-1 flex-wrap">
            {labels.slice(0, 3).map((label: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5 bg-muted/50">
                {label}
              </Badge>
            ))}
            {labels.length > 3 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-muted">
                +{labels.length - 3}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Assignee */}
      <div className="flex items-center gap-x-2">
        {task.assignee ? (
          <div className="flex items-center gap-x-1.5">
            <MemberAvatar 
              name={task.assignee.name}
              className="size-6"
            />
            <div className="flex flex-col">
              <p className="text-xs font-medium text-foreground">{task.assignee.name}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-x-1.5">
            <div className="size-6 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="size-3 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Unassigned</span>
          </div>
        )}
      </div>

      {/* Due Date */}
      {task.dueDate && (
        <div className={getDueDateClassName()}>
          <CalendarIcon className={getIconClassName()} />
          <TaskDate value={task.dueDate || ""} className="text-xs" />
          {dueDateStatus === 'overdue' && <Badge variant="destructive" className="text-xs px-1 py-0">Overdue</Badge>}
          {dueDateStatus === 'urgent' && <Badge variant="destructive" className="text-xs px-1 py-0 bg-orange-500">Due Soon</Badge>}
        </div>
      )}

      {/* Resolution Status */}
      {task.resolution && (
        <div className="flex items-center gap-x-1.5">
          <CheckCircleIcon className="size-3 text-green-500 dark:text-green-400" />
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">{task.resolution}</span>
        </div>
      )}

      {/* Project Avatar */}
      {task.project && (
        <div className="flex items-center gap-x-1.5">
          <ProjectAvatar 
            name={task.project.name}
            image={task.project.imageUrl ?? undefined}
            className="size-5"
          />
          <span className="text-xs text-muted-foreground">{task.project.name}</span>
        </div>
      )}

      <DottedSeparator className="my-2" />

      {/* Timestamps */}
      <div className="flex flex-col gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-x-1.5">
          <Clock className="size-3" />
          <span>Created: {formatDateTime(task.created)}</span>
        </div>
        {task.updated !== task.created && (
          <div className="flex items-center gap-x-1.5">
            <Clock className="size-3" />
            <span>Updated: {formatDateTime(task.updated)}</span>
          </div>
        )}
        {task.resolved && (
          <div className="flex items-center gap-x-1.5">
            <CheckCircleIcon className="size-3 text-green-500 dark:text-green-400" />
            <span>Resolved: {formatDateTime(task.resolved)}</span>
          </div>
        )}
      </div>
    </div>
  );
};