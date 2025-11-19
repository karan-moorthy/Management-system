import { ActivityAction, EntityType, generateActivitySummary, type ActivityLogData } from "../types";

// Helper function to create activity log data
export const createActivityLog = (
  actionType: ActivityAction,
  entityType: EntityType,
  entityId: string,
  userId: string,
  userName: string,
  options?: {
    workspaceId?: string;
    projectId?: string | null;
    taskId?: string | null;
    oldValue?: string | null;
    newValue?: string | null;
    field?: string;
    description?: string;
    metadata?: Record<string, any>;
  }
): ActivityLogData => {
  const changes = (options?.oldValue || options?.newValue || options?.field)
    ? {
        field: options.field,
        oldValue: options.oldValue,
        newValue: options.newValue,
        description: options.description,
        metadata: options.metadata,
      }
    : undefined;

  const summary = options?.description || generateActivitySummary(actionType, userName, changes);

  return {
    actionType,
    entityType,
    entityId,
    userId,
    userName,
    workspaceId: options?.workspaceId,
    projectId: options?.projectId,
    taskId: options?.taskId,
    changes,
    summary,
  };
};

// Utility function to log task creation
export const logTaskCreated = (
  taskId: string,
  taskSummary: string,
  userId: string,
  userName: string,
  workspaceId: string,
  projectId?: string | null
): ActivityLogData => {
  return createActivityLog(
    ActivityAction.TASK_CREATED,
    EntityType.TASK,
    taskId,
    userId,
    userName,
    {
      workspaceId,
      projectId,
      taskId,
      description: `${userName} created task "${taskSummary}"`,
    }
  );
};

// Utility function to log status change
export const logStatusChanged = (
  taskId: string,
  taskSummary: string,
  oldStatus: string,
  newStatus: string,
  userId: string,
  userName: string,
  workspaceId: string,
  projectId?: string | null
): ActivityLogData => {
  return createActivityLog(
    ActivityAction.STATUS_CHANGED,
    EntityType.TASK,
    taskId,
    userId,
    userName,
    {
      workspaceId,
      projectId,
      taskId,
      oldValue: oldStatus,
      newValue: newStatus,
      field: "status",
      description: `${userName} moved "${taskSummary}" from ${oldStatus} to ${newStatus}`,
    }
  );
};

// Utility function to log task assignment
export const logTaskAssigned = (
  taskId: string,
  taskSummary: string,
  assigneeName: string,
  userId: string,
  userName: string,
  workspaceId: string,
  projectId?: string | null
): ActivityLogData => {
  return createActivityLog(
    ActivityAction.ASSIGNED,
    EntityType.TASK,
    taskId,
    userId,
    userName,
    {
      workspaceId,
      projectId,
      taskId,
      newValue: assigneeName,
      field: "assignee",
      description: `${userName} assigned "${taskSummary}" to ${assigneeName}`,
    }
  );
};

// Utility function to log due date change
export const logDueDateChanged = (
  taskId: string,
  taskSummary: string,
  oldDueDate: string | null,
  newDueDate: string | null,
  userId: string,
  userName: string,
  workspaceId: string,
  projectId?: string | null
): ActivityLogData => {
  return createActivityLog(
    ActivityAction.DUE_DATE_CHANGED,
    EntityType.TASK,
    taskId,
    userId,
    userName,
    {
      workspaceId,
      projectId,
      taskId,
      oldValue: oldDueDate || "No due date",
      newValue: newDueDate || "No due date",
      field: "dueDate",
      description: `${userName} changed due date for "${taskSummary}"`,
    }
  );
};

// Utility function to log task deletion
export const logTaskDeleted = (
  taskId: string,
  taskSummary: string,
  userId: string,
  userName: string,
  workspaceId: string,
  projectId?: string | null
): ActivityLogData => {
  return createActivityLog(
    ActivityAction.TASK_DELETED,
    EntityType.TASK,
    taskId,
    userId,
    userName,
    {
      workspaceId,
      projectId,
      taskId,
      description: `${userName} deleted task "${taskSummary}"`,
    }
  );
};

// Utility function to log project creation
export const logProjectCreated = (
  projectId: string,
  projectName: string,
  userId: string,
  userName: string,
  workspaceId: string
): ActivityLogData => {
  return createActivityLog(
    ActivityAction.PROJECT_CREATED,
    EntityType.PROJECT,
    projectId,
    userId,
    userName,
    {
      workspaceId,
      projectId,
      description: `${userName} created project "${projectName}"`,
    }
  );
};

// Utility function to log user joined workspace
export const logUserJoined = (
  userId: string,
  userName: string,
  workspaceId: string
): ActivityLogData => {
  return createActivityLog(
    ActivityAction.USER_JOINED,
    EntityType.USER,
    userId,
    userId,
    userName,
    {
      workspaceId,
      description: `${userName} joined the workspace`,
    }
  );
};
