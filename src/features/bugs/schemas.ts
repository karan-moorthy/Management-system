import { z } from "zod";

export const createBugSchema = z.object({
  assignedTo: z.string().min(1, "Please select an assignee"),
  bugType: z.string().min(1, "Please select a bug type"),
  bugDescription: z.string().min(10, "Bug description must be at least 10 characters"),
  fileUrl: z.string().optional(),
  priority: z.string().optional(),
  workspaceId: z.string().optional(),
});

export const updateBugSchema = z.object({
  bugId: z.string(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
});

export const createBugTypeSchema = z.object({
  name: z.string().min(1, "Bug type name is required"),
});
