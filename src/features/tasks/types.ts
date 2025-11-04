export enum TaskStatus {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  DONE = "DONE",
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum TaskImportance {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export type Task = {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  status: TaskStatus;
  workspaceId: string;
  assigneeId: string;
  projectId: string;
  position: number;
  dueDate: string;
  description?: string;
  priority?: TaskPriority;
  importance?: TaskImportance;
  category?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
};

export type ExcelTaskData = {
  name: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  importance: TaskImportance;
  dueDate: string;
  category?: string;
  estimatedHours?: number;
  assigneeEmail?: string;
  tags?: string[];
};
