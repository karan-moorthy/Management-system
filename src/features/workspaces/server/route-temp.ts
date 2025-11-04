import { Hono } from "hono";
import { eq, desc, inArray } from "drizzle-orm";

import { sessionMiddleware } from "@/lib/session-middleware";
import { db } from "@/db";
import { workspaces, members } from "@/db/schema";
import { getMember } from "@/features/members/utils";

const app = new Hono()
  // List all workspaces for current user
  .get("/", sessionMiddleware, async (c) => {
    const user = c.get("user");

    // Get all memberships for this user
    const userMembers = await db
      .select()
      .from(members)
      .where(eq(members.userId, user.id));

    if (userMembers.length === 0) {
      return c.json({ data: { documents: [], total: 0 } });
    }

    const workspaceIds = userMembers.map((member) => member.workspaceId);

    // Get all workspaces user is a member of
    const userWorkspaces = await db
      .select()
      .from(workspaces)
      .where(inArray(workspaces.id, workspaceIds))
      .orderBy(desc(workspaces.createdAt));

    return c.json({ 
      data: { 
        documents: userWorkspaces,
        total: userWorkspaces.length 
      } 
    });
  })
  
  // Get single workspace
  .get("/:workspaceId", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const { workspaceId } = c.req.param();

    const member = await getMember({
      workspaceId,
      userId: user.id,
    });

    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    return c.json({ data: workspace });
  })
  
  // Get workspace info
  .get("/:workspaceId/info", sessionMiddleware, async (c) => {
    const { workspaceId } = c.req.param();

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    return c.json({
      data: {
        id: workspace.id,
        name: workspace.name,
        imageUrl: workspace.imageUrl,
      },
    });
  });

  // TODO: Add create, update, delete routes after fixing image upload
  
export default app;
