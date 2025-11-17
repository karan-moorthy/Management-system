import { Hono } from "hono";
import { handle } from "hono/vercel";

import auth from "@/features/auth/server/route";
import members from "@/features/members/server/route";
import workspaces from "@/features/workspaces/server/route";
import projects from "@/features/projects/server/route";
import tasks from "@/features/tasks/server/route";
import invitations from "@/features/invitations/server/route";
import attendance from "@/features/attendance/server/route";
import profiles from "@/features/profiles/server/route";
import profilesBulkUpload from "@/features/profiles/server/bulk-upload-route";
import requirements from "@/features/requirements/server/route";

const app = new Hono().basePath("/api");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = app
  .route("/auth", auth)
  .route("/workspaces", workspaces)
  .route("/members", members)
  .route("/projects", projects)
  .route("/tasks", tasks)
  .route("/invitations", invitations)
  .route("/attendance", attendance)
  .route("/profiles", profiles)
  .route("/profiles/bulk-upload", profilesBulkUpload)
  .route("/requirements", requirements);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
