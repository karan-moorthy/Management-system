import { z } from "zod";

import { TaskStatus, TaskPriority, IssueType, Resolution } from "./types";

export const createTaskSchema = z.object({
  summary: z.string().trim().min(1, "Required"),
  issueId: z.string().trim().optional(),
  issueType: z.nativeEnum(IssueType).optional(),
  status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
  projectName: z.string().trim().nullable().optional(),
  workspaceId: z.string().optional(),
  projectId: z.string().trim().optional(),
  parentTaskId: z.string().trim().optional(), // For subtasks
  dueDate: z.coerce.date().optional(),
  assigneeId: z.string().trim().optional(),
  reporterId: z.string().optional(),
  creatorId: z.string().optional(),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  resolution: z.nativeEnum(Resolution).optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  labels: z.array(z.string()).optional(),
});

export const bulkCreateTasksSchema = z.object({
  workspaceId: z.string().trim().min(1, "Required"),
  projectId: z.string().trim().min(1, "Required"),
  tasks: z.array(z.object({
    summary: z.string().trim().min(1, "Required"),
    issueId: z.string().trim().optional(),
    description: z.string().optional(),
    status: z.nativeEnum(TaskStatus),
    priority: z.nativeEnum(TaskPriority),
    issueType: z.nativeEnum(IssueType),
    dueDate: z.string().optional(),
    projectName: z.string().trim().min(1, "Required"),
    estimatedHours: z.number().optional(),
    assigneeEmail: z.string().email().optional(),
    labels: z.array(z.string()).optional(),
  })),
});

export const uploadTasksSchema = z.object({
  workspaceId: z.string().trim().min(1, "Required"),
  projectId: z.string().trim().min(1, "Required"),
});
