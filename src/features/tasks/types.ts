export enum TaskStatus {
  BACKLOG = "BACKLOG",
  TODO = "To Do",
  IN_PROGRESS = "In Progress",
  IN_REVIEW = "IN_REVIEW",
  DONE = "Done",
}

export enum TaskPriority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  CRITICAL = "Critical",
}

export enum IssueType {
  TASK = "Task",
  BUG = "Bug",
  EPIC = "Epic",
  STORY = "Story",
  SUB_TASK = "Sub-task",
  IMPROVEMENT = "Improvement",
}

export enum Resolution {
  DONE = "Done",
  WONT_FIX = "Won't Fix",
  DUPLICATE = "Duplicate",
  CANNOT_REPRODUCE = "Cannot Reproduce",
  INCOMPLETE = "Incomplete",
  FIXED = "Fixed",
}

export type Task = {
  id: string;
  summary: string;
  issueId: string;
  issueType: IssueType;
  status: TaskStatus;
  projectName: string | null;
  priority: TaskPriority;
  resolution?: Resolution;
  assigneeId?: string;
  reporterId?: string;
  creatorId?: string;
  created: string;
  updated: string;
  resolved?: string;
  dueDate?: string;
  labels?: string[];
  description?: string;
  projectId?: string;
  workspaceId: string;
  estimatedHours?: number;
  actualHours: number;
  position: number;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string | null;
    imageUrl: string | null;
  };
};

export type ExcelTaskData = {
  summary: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  issueType: IssueType;
  dueDate?: string;
  projectName: string;
  estimatedHours?: number;
  assigneeEmail?: string;
  labels?: string[];
};

// Task Overview types for completion workflow
export enum OverviewStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REWORK = "REWORK",
}

export type ProofOfWork = {
  screenshots?: string[];
  files?: string[];
  links?: string[];
  githubCommits?: string[];
};

export type TaskOverview = {
  id: string;
  taskId: string;
  employeeId: string;
  completedWorkDescription: string;
  completionMethod: string;
  stepsFollowed: string;
  proofOfWork: ProofOfWork;
  challenges?: string;
  additionalRemarks?: string;
  timeSpent?: number;
  taskTitle: string;
  employeeName: string;
  resolvedDate?: string;
  resolvedTime?: string;
  status: OverviewStatus;
  adminRemarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskOverviewPayload = {
  taskId: string;
  completedWorkDescription: string;
  completionMethod: string;
  stepsFollowed: string;
  proofOfWork: ProofOfWork;
  challenges?: string;
  additionalRemarks?: string;
  timeSpent?: number;
};

export type ReviewTaskOverviewPayload = {
  overviewId: string;
  status: OverviewStatus.APPROVED | OverviewStatus.REWORK;
  adminRemarks?: string;
};

// Notification types
export enum NotificationType {
  TASK_REWORK = "TASK_REWORK",
  ADMIN_REMARK = "ADMIN_REMARK",
  TASK_APPROVED = "TASK_APPROVED",
  TASK_ASSIGNED = "TASK_ASSIGNED",
  OVERVIEW_REQUIRED = "OVERVIEW_REQUIRED",
}

export type Notification = {
  id: string;
  userId: string;
  taskId?: string;
  type: NotificationType;
  title: string;
  message: string;
  actionBy?: string;
  actionByName?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
};
