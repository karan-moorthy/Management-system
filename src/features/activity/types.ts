// Activity Log Types and Constants (Jira-style)

export enum ActivityAction {
  // Task actions
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
  DUE_DATE_CHANGED = 'DUE_DATE_CHANGED',
  DESCRIPTION_UPDATED = 'DESCRIPTION_UPDATED',
  LABELS_UPDATED = 'LABELS_UPDATED',
  COLUMN_MOVED = 'COLUMN_MOVED',
  
  // Project actions
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_DELETED = 'PROJECT_DELETED',
  PROJECT_MEMBER_ADDED = 'PROJECT_MEMBER_ADDED',
  PROJECT_MEMBER_REMOVED = 'PROJECT_MEMBER_REMOVED',
  
  // User/Member actions
  USER_JOINED = 'USER_JOINED',
  USER_LEFT = 'USER_LEFT',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  MEMBER_INVITED = 'MEMBER_INVITED',
  
  // Workspace actions
  WORKSPACE_CREATED = 'WORKSPACE_CREATED',
  WORKSPACE_UPDATED = 'WORKSPACE_UPDATED',
  
  // Comment actions (future)
  COMMENT_ADDED = 'COMMENT_ADDED',
  COMMENT_EDITED = 'COMMENT_EDITED',
  COMMENT_DELETED = 'COMMENT_DELETED',
  
  // Attachment actions (future)
  ATTACHMENT_ADDED = 'ATTACHMENT_ADDED',
  ATTACHMENT_REMOVED = 'ATTACHMENT_REMOVED',
}

export enum EntityType {
  TASK = 'TASK',
  PROJECT = 'PROJECT',
  USER = 'USER',
  WORKSPACE = 'WORKSPACE',
  MEMBER = 'MEMBER',
}

export interface ActivityChange {
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ActivityLogData {
  actionType: ActivityAction;
  entityType: EntityType;
  entityId: string;
  userId: string;
  userName: string;
  workspaceId?: string;
  projectId?: string | null;
  taskId?: string | null;
  changes?: ActivityChange;
  summary: string;
}

// Helper function to generate activity summaries (Jira-style)
export const generateActivitySummary = (
  action: ActivityAction,
  userName: string,
  changes?: ActivityChange
): string => {
  switch (action) {
    case ActivityAction.TASK_CREATED:
      return `${userName} created a new task`;
    
    case ActivityAction.STATUS_CHANGED:
      return `${userName} changed status from ${changes?.oldValue || 'unknown'} to ${changes?.newValue || 'unknown'}`;
    
    case ActivityAction.ASSIGNED:
      return `${userName} assigned this task to ${changes?.newValue || 'someone'}`;
    
    case ActivityAction.UNASSIGNED:
      return `${userName} unassigned ${changes?.oldValue || 'someone'} from this task`;
    
    case ActivityAction.PRIORITY_CHANGED:
      return `${userName} changed priority from ${changes?.oldValue || 'normal'} to ${changes?.newValue || 'normal'}`;
    
    case ActivityAction.DUE_DATE_CHANGED:
      return `${userName} changed due date from ${changes?.oldValue || 'none'} to ${changes?.newValue || 'none'}`;
    
    case ActivityAction.DESCRIPTION_UPDATED:
      return `${userName} updated the description`;
    
    case ActivityAction.LABELS_UPDATED:
      return `${userName} updated labels`;
    
    case ActivityAction.COLUMN_MOVED:
      return `${userName} moved this task to ${changes?.newValue || 'another column'}`;
    
    case ActivityAction.TASK_DELETED:
      return `${userName} deleted a task`;
    
    case ActivityAction.PROJECT_CREATED:
      return `${userName} created a new project`;
    
    case ActivityAction.PROJECT_UPDATED:
      return `${userName} updated project details`;
    
    case ActivityAction.USER_JOINED:
      return `${userName} joined the workspace`;
    
    case ActivityAction.USER_LEFT:
      return `${userName} left the workspace`;
    
    case ActivityAction.MEMBER_INVITED:
      return `${userName} invited ${changes?.newValue || 'a new member'} to the workspace`;
    
    case ActivityAction.COMMENT_ADDED:
      return `${userName} added a comment`;
    
    case ActivityAction.ATTACHMENT_ADDED:
      return `${userName} added an attachment`;
    
    default:
      return `${userName} performed an action`;
  }
};

// Activity icon mapping (for UI)
export const activityIcons: Record<ActivityAction, string> = {
  [ActivityAction.TASK_CREATED]: '✨',
  [ActivityAction.TASK_UPDATED]: '📝',
  [ActivityAction.TASK_DELETED]: '🗑️',
  [ActivityAction.STATUS_CHANGED]: '🔄',
  [ActivityAction.PRIORITY_CHANGED]: '⚡',
  [ActivityAction.ASSIGNED]: '👤',
  [ActivityAction.UNASSIGNED]: '👥',
  [ActivityAction.DUE_DATE_CHANGED]: '📅',
  [ActivityAction.DESCRIPTION_UPDATED]: '📄',
  [ActivityAction.LABELS_UPDATED]: '🏷️',
  [ActivityAction.COLUMN_MOVED]: '➡️',
  [ActivityAction.PROJECT_CREATED]: '📁',
  [ActivityAction.PROJECT_UPDATED]: '🔧',
  [ActivityAction.PROJECT_DELETED]: '🗑️',
  [ActivityAction.PROJECT_MEMBER_ADDED]: '➕',
  [ActivityAction.PROJECT_MEMBER_REMOVED]: '➖',
  [ActivityAction.USER_JOINED]: '🎉',
  [ActivityAction.USER_LEFT]: '👋',
  [ActivityAction.USER_ROLE_CHANGED]: '🔑',
  [ActivityAction.MEMBER_INVITED]: '📧',
  [ActivityAction.WORKSPACE_CREATED]: '🏢',
  [ActivityAction.WORKSPACE_UPDATED]: '⚙️',
  [ActivityAction.COMMENT_ADDED]: '💬',
  [ActivityAction.COMMENT_EDITED]: '✏️',
  [ActivityAction.COMMENT_DELETED]: '🗑️',
  [ActivityAction.ATTACHMENT_ADDED]: '📎',
  [ActivityAction.ATTACHMENT_REMOVED]: '🗑️',
};

// Activity color mapping (for UI badges)
export const activityColors: Record<ActivityAction, string> = {
  [ActivityAction.TASK_CREATED]: 'green',
  [ActivityAction.TASK_UPDATED]: 'blue',
  [ActivityAction.TASK_DELETED]: 'red',
  [ActivityAction.STATUS_CHANGED]: 'purple',
  [ActivityAction.PRIORITY_CHANGED]: 'orange',
  [ActivityAction.ASSIGNED]: 'cyan',
  [ActivityAction.UNASSIGNED]: 'gray',
  [ActivityAction.DUE_DATE_CHANGED]: 'yellow',
  [ActivityAction.DESCRIPTION_UPDATED]: 'blue',
  [ActivityAction.LABELS_UPDATED]: 'pink',
  [ActivityAction.COLUMN_MOVED]: 'indigo',
  [ActivityAction.PROJECT_CREATED]: 'green',
  [ActivityAction.PROJECT_UPDATED]: 'blue',
  [ActivityAction.PROJECT_DELETED]: 'red',
  [ActivityAction.PROJECT_MEMBER_ADDED]: 'green',
  [ActivityAction.PROJECT_MEMBER_REMOVED]: 'red',
  [ActivityAction.USER_JOINED]: 'green',
  [ActivityAction.USER_LEFT]: 'gray',
  [ActivityAction.USER_ROLE_CHANGED]: 'purple',
  [ActivityAction.MEMBER_INVITED]: 'blue',
  [ActivityAction.WORKSPACE_CREATED]: 'green',
  [ActivityAction.WORKSPACE_UPDATED]: 'blue',
  [ActivityAction.COMMENT_ADDED]: 'blue',
  [ActivityAction.COMMENT_EDITED]: 'yellow',
  [ActivityAction.COMMENT_DELETED]: 'red',
  [ActivityAction.ATTACHMENT_ADDED]: 'green',
  [ActivityAction.ATTACHMENT_REMOVED]: 'red',
};
