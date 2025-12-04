export enum BugStatus {
  OPEN = "Open",
  IN_PROGRESS = "In Progress",
  RESOLVED = "Resolved",
  CLOSED = "Closed",
}

export enum BugPriority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  CRITICAL = "Critical",
}

export type Bug = {
  id: string;
  bugId: string;
  assignedTo: string | null;
  assignedToName?: string;
  bugType: string;
  bugDescription: string;
  fileUrl: string | null;
  status: string;
  priority: string | null;
  reportedBy: string;
  reportedByName: string;
  workspaceId: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomBugType = {
  id: string;
  name: string;
  createdAt: Date | null;
};

export type CreateBugPayload = {
  assignedTo: string;
  bugType: string;
  bugDescription: string;
  fileUrl?: string;
  priority?: string;
};

export type UpdateBugPayload = {
  bugId: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
};
