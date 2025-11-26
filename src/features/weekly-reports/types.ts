import { weeklyReports } from "@/db/schema";

export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type NewWeeklyReport = typeof weeklyReports.$inferInsert;

export interface DailyReportEntry {
  date: string;
  description: string;
  files: UploadedFile[];
}

export interface UploadedFile {
  date: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
}

export type WeeklyReportStatus = "draft" | "submitted" | "reviewed" | "archived";
