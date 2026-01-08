import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getCookie } from "hono/cookie";
import { AUTH_COOKIE } from "@/features/auth/constants";

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    // Get session from cookies
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [key, ...rest] = c.trim().split("=");
        return [key, rest.join("=")];
      })
    );
    const sessionToken = cookies[AUTH_COOKIE];

    console.log('[Task Delete] Session token:', sessionToken ? 'Found' : 'Not found');

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized - No session" }, { status: 401 });
    }

    // Get user from session
    const sessions = await sql`
      SELECT user_id FROM sessions 
      WHERE session_token = ${sessionToken} 
      AND expires > NOW()
    `;

    if (sessions.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessions[0].user_id;

    // Get user details
    const users = await sql`
      SELECT id, name FROM users WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = users[0];

    // Get task details
    const tasks = await sql`
      SELECT * FROM tasks WHERE id = ${taskId}
    `;

    if (tasks.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const task = tasks[0];

    // Check authorization
    if (task.workspace_id) {
      const members = await sql`
        SELECT role FROM members 
        WHERE workspace_id = ${task.workspace_id} 
        AND user_id = ${userId}
      `;

      if (members.length === 0) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const role = members[0].role;
      
      // Only ADMIN can delete tasks
      if (role !== "ADMIN") {
        return NextResponse.json(
          { error: "Forbidden: Only admins can delete tasks" },
          { status: 403 }
        );
      }
    }

    // Log activity BEFORE deletion (so task still exists)
    const changes = JSON.stringify({
      metadata: {
        taskSummary: task.summary,
        taskStatus: task.status,
        taskIssueId: task.issue_id,
      },
    });

    await sql`
      INSERT INTO activity_logs (
        action_type, entity_type, entity_id, user_id, user_name,
        workspace_id, project_id, task_id, summary, changes
      ) VALUES (
        'TASK_DELETED', 'TASK', ${task.id}, ${user.id}, ${user.name},
        ${task.workspace_id}, ${task.project_id}, ${task.id},
        ${user.name + ' deleted task "' + task.summary + '"'}, ${changes}
      )
    `;

    // Delete subtasks first
    await sql`DELETE FROM tasks WHERE parent_task_id = ${taskId}`;

    // Delete main task
    await sql`DELETE FROM tasks WHERE id = ${taskId}`;

    return NextResponse.json({
      data: { id: taskId },
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("[Task Delete] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
