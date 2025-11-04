import { z } from "zod";

import { TaskStatus, TaskPriority, TaskImportance } from "./types";

export const createTaskSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
  workspaceId: z.string().trim().min(1, "Required"),
  projectId: z.string().trim().min(1, "Required"),
  dueDate: z.coerce.date(),
  assigneeId: z.string().trim().min(1, "Required"),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  importance: z.nativeEnum(TaskImportance).optional(),
  category: z.string().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

export const bulkCreateTasksSchema = z.object({
  workspaceId: z.string().trim().min(1, "Required"),
  projectId: z.string().trim().min(1, "Required"),
  tasks: z.array(z.object({
    name: z.string().trim().min(1, "Required"),
    description: z.string().optional(),
    status: z.nativeEnum(TaskStatus),
    priority: z.nativeEnum(TaskPriority),
    importance: z.nativeEnum(TaskImportance),
    dueDate: z.string(),
    category: z.string().optional(),
    estimatedHours: z.number().optional(),
    assigneeEmail: z.string().email().optional(),
    tags: z.array(z.string()).optional(),
  })),
});

export const uploadTasksSchema = z.object({
  workspaceId: z.string().trim().min(1, "Required"),
  projectId: z.string().trim().min(1, "Required"),
});
