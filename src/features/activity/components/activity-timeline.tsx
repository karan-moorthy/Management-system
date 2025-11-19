import { formatDistanceToNow } from "date-fns";
import {
  Sparkles,
  Edit3,
  Trash2,
  RefreshCw,
  Zap,
  User,
  Users,
  Calendar,
  FileText,
  Tag,
  ArrowRight,
  FolderPlus,
  Settings,
  UserPlus,
  UserMinus,
  PartyPopper,
  LogOut,
  Key,
  Mail,
  Building2,
  MessageCircle,
  Paperclip,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import { ActivityAction } from "../types";

interface ActivityLog {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  workspaceId: string | null;
  projectId: string | null;
  taskId: string | null;
  changes?: {
    field?: string;
    oldValue?: string | null;
    newValue?: string | null;
    description?: string;
    metadata?: Record<string, any>;
  };
  summary: string;
  createdAt: string;
}

interface ActivityTimelineProps {
  activities: ActivityLog[];
  isLoading?: boolean;
  showGrouping?: boolean; // Group by date like Jira
  maxHeight?: string;
}

// Icon mapping (Jira-style)
const getActivityIcon = (actionType: string) => {
  const iconClass = "size-4";
  
  switch (actionType) {
    case ActivityAction.TASK_CREATED:
      return <Sparkles className={iconClass} />;
    case ActivityAction.TASK_UPDATED:
      return <Edit3 className={iconClass} />;
    case ActivityAction.TASK_DELETED:
      return <Trash2 className={iconClass} />;
    case ActivityAction.STATUS_CHANGED:
    case ActivityAction.COLUMN_MOVED:
      return <RefreshCw className={iconClass} />;
    case ActivityAction.PRIORITY_CHANGED:
      return <Zap className={iconClass} />;
    case ActivityAction.ASSIGNED:
      return <User className={iconClass} />;
    case ActivityAction.UNASSIGNED:
      return <Users className={iconClass} />;
    case ActivityAction.DUE_DATE_CHANGED:
      return <Calendar className={iconClass} />;
    case ActivityAction.DESCRIPTION_UPDATED:
      return <FileText className={iconClass} />;
    case ActivityAction.LABELS_UPDATED:
      return <Tag className={iconClass} />;
    case ActivityAction.PROJECT_CREATED:
      return <FolderPlus className={iconClass} />;
    case ActivityAction.PROJECT_UPDATED:
      return <Settings className={iconClass} />;
    case ActivityAction.PROJECT_MEMBER_ADDED:
      return <UserPlus className={iconClass} />;
    case ActivityAction.PROJECT_MEMBER_REMOVED:
      return <UserMinus className={iconClass} />;
    case ActivityAction.USER_JOINED:
      return <PartyPopper className={iconClass} />;
    case ActivityAction.USER_LEFT:
      return <LogOut className={iconClass} />;
    case ActivityAction.USER_ROLE_CHANGED:
      return <Key className={iconClass} />;
    case ActivityAction.MEMBER_INVITED:
      return <Mail className={iconClass} />;
    case ActivityAction.WORKSPACE_CREATED:
    case ActivityAction.WORKSPACE_UPDATED:
      return <Building2 className={iconClass} />;
    case ActivityAction.COMMENT_ADDED:
      return <MessageCircle className={iconClass} />;
    case ActivityAction.ATTACHMENT_ADDED:
      return <Paperclip className={iconClass} />;
    default:
      return <Edit3 className={iconClass} />;
  }
};

// Color mapping (Jira-style badges)
const getActivityColor = (actionType: string): string => {
  switch (actionType) {
    case ActivityAction.TASK_CREATED:
    case ActivityAction.PROJECT_CREATED:
    case ActivityAction.USER_JOINED:
    case ActivityAction.PROJECT_MEMBER_ADDED:
    case ActivityAction.WORKSPACE_CREATED:
      return "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800";
    
    case ActivityAction.TASK_DELETED:
    case ActivityAction.PROJECT_DELETED:
    case ActivityAction.USER_LEFT:
    case ActivityAction.PROJECT_MEMBER_REMOVED:
      return "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800";
    
    case ActivityAction.STATUS_CHANGED:
    case ActivityAction.COLUMN_MOVED:
    case ActivityAction.USER_ROLE_CHANGED:
      return "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800";
    
    case ActivityAction.PRIORITY_CHANGED:
      return "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-800";
    
    case ActivityAction.ASSIGNED:
      return "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800";
    
    default:
      return "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800";
  }
};

// Group activities by date (Jira-style)
const groupByDate = (activities: ActivityLog[]): Record<string, ActivityLog[]> => {
  const groups: Record<string, ActivityLog[]> = {};
  
  activities.forEach((activity) => {
    const date = new Date(activity.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateKey: string;
    
    if (date.toDateString() === today.toDateString()) {
      dateKey = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = "Yesterday";
    } else {
      dateKey = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    
    groups[dateKey].push(activity);
  });
  
  return groups;
};

export const ActivityTimeline = ({
  activities,
  isLoading = false,
  showGrouping = true,
  maxHeight = "600px",
}: ActivityTimelineProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="size-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="size-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Activity will appear here as you work
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedActivities = showGrouping ? groupByDate(activities) : { "All": activities };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" style={{ maxHeight, overflowY: "auto" }}>
          {Object.entries(groupedActivities).map(([date, dateActivities]) => (
            <div key={date}>
              {showGrouping && (
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">{date}</h3>
                  <Separator className="flex-1" />
                </div>
              )}
              
              <div className="space-y-3">
                {dateActivities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    {/* Icon with color */}
                    <div className={`flex items-center justify-center size-8 rounded-full border-2 ${getActivityColor(activity.actionType)}`}>
                      {getActivityIcon(activity.actionType)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Summary */}
                      <p className="text-sm font-medium leading-relaxed">
                        {activity.summary}
                      </p>
                      
                      {/* Change details (if available) */}
                      {activity.changes && activity.changes.oldValue && activity.changes.newValue && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {activity.changes.oldValue}
                          </Badge>
                          <ArrowRight className="size-3" />
                          <Badge variant="outline" className="text-xs">
                            {activity.changes.newValue}
                          </Badge>
                        </div>
                      )}
                      
                      {/* Metadata row */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        {/* User avatar */}
                        <div className="flex items-center gap-1.5">
                          <Avatar className="size-4">
                            <AvatarFallback className="text-[8px]">
                              {activity.userName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{activity.userName}</span>
                        </div>
                        
                        <span>•</span>
                        
                        {/* Time ago */}
                        <span>
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                        
                        {/* Entity type badge */}
                        {activity.entityType && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              {activity.entityType}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Separator between date groups */}
              {showGrouping && index < Object.keys(groupedActivities).length - 1 && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
