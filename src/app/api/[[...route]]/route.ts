import { Hono } from "hono";
import { handle } from "hono/vercel";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { startCronService } from "@/lib/cron-service";

import auth from "@/features/auth/server/route";
import authDebug from "@/features/auth/server/debug-route";
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

// Global error handler - ensures JSON responses even for uncaught errors
app.onError((err, c) => {
  console.error('Global API error:', err);
  
  // Return JSON error response instead of HTML
  return c.json(
    {
      error: "Internal server error",
      message: err.message || "An unexpected error occurred",
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    },
    500
  );
});

// CORS configuration for production
const isProd = process.env.NODE_ENV === 'production';
if (isProd && process.env.NEXT_PUBLIC_APP_URL) {
  app.use("*", cors({
    origin: process.env.NEXT_PUBLIC_APP_URL,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'Set-Cookie'],
    maxAge: 600,
  }));
}

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
  .route("/auth", authDebug) // Debug endpoint: /api/auth/debug
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

// Wrap Hono handlers to match Next.js 16 signature
const handler = handle(app);

export async function GET(req: Request, context: any) {
  return handler(req, context);
}

export async function POST(req: Request, context: any) {
  return handler(req, context);
}

export async function PATCH(req: Request, context: any) {
  return handler(req, context);
}

export async function DELETE(req: Request, context: any) {
  return handler(req, context);
}

export type AppType = typeof routes;
