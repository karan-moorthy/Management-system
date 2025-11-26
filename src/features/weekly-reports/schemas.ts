import { z } from "zod";

// Schema for creating a weekly report
export const createWeeklyReportSchema = z.object({
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  department: z.string().min(1, "Department is required"),
  dailyDescriptions: z.record(z.string(), z.string()), // { "2025-11-25": "description" }
  uploadedFiles: z.array(z.object({
    date: z.string(),
    fileName: z.string(),
    fileUrl: z.string(),
    fileSize: z.number(),
    uploadedAt: z.string(),
  })).optional().default([]),
});

// Schema for filtering reports (admin)
export const getWeeklyReportsSchema = z.object({
  department: z.string().optional(),
  userId: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});
