import { Hono } from "hono";
import { handle } from "hono/vercel";
import { bodyLimit } from "hono/body-limit";
import { startCronService } from "@/lib/cron-service";

import auth from "@/features/auth/server/route";
import members from "@/features/members/server/route";
import workspaces from "@/features/workspaces/server/route";
import projects from "@/features/projects/server/route";
import tasks from "@/features/tasks/server/route";
import workflows from "@/features/tasks/server/workflows-route";
import listViewColumns from "@/features/tasks/server/list-view-columns-route";
import invitations from "@/features/invitations/server/route";
import attendance from "@/features/attendance/server/route";
import profiles from "@/features/profiles/server/route";
import profilesBulkUpload from "@/features/profiles/server/bulk-upload-route";
import requirements from "@/features/requirements/server/route";
import activity from "@/features/activity/server/route";
import taskOverviews from "@/features/task-overviews/server/route";
import notifications from "@/features/notifications/server/route";
import weeklyReports from "@/features/weekly-reports/server/route";
import bugs from "@/features/bugs/server/route";
import admin from "@/features/admin/server/route";
import clients from "@/features/clients/server/route";

const app = new Hono().basePath("/api");

// Body size limit configuration
// Note: Vercel limits are 4.5MB (Hobby), 10MB (Pro), 50MB (Enterprise)
// Set conservatively to avoid 413 errors
const MAX_BODY_SIZE = process.env.VERCEL_ENV 
  ? 4 * 1024 * 1024   // 4MB for Vercel (under Hobby plan limit)
  : 10 * 1024 * 1024; // 10MB for local development

app.use("*", bodyLimit({
  maxSize: MAX_BODY_SIZE,
  onError: (c) => {
    const maxSizeMB = (MAX_BODY_SIZE / (1024 * 1024)).toFixed(1);
    return c.json({ 
      error: `File too large. Maximum size is ${maxSizeMB}MB.`,
      details: "Please reduce file size or split into smaller files.",
      maxSizeBytes: MAX_BODY_SIZE
    }, 413);
  },
}));

// Root health check endpoint
app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    message: "API is running",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = app
  .route("/auth", auth)
  .route("/workspaces", workspaces)
  .route("/members", members)
  .route("/projects", projects)
  .route("/tasks", tasks)
  .route("/tasks/workflows", workflows)
  .route("/tasks/list-view", listViewColumns)
  .route("/invitations", invitations)
  .route("/attendance", attendance)
  .route("/profiles", profiles)
  .route("/profiles/bulk-upload", profilesBulkUpload)
  .route("/requirements", requirements)
  .route("/activity", activity)
  .route("/task-overviews", taskOverviews)
  .route("/notifications", notifications)
  .route("/weekly-reports", weeklyReports)
  .route("/bugs", bugs)
  .route("/admin", admin)
  .route("/clients", clients);

// Start cron service for auto-ending shifts at 11:59 PM
if (process.env.NODE_ENV !== 'test') {
  startCronService();
}

// Configure route for larger payloads (bulk uploads)
export const runtime = 'nodejs';
export const maxDuration = 60;

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
