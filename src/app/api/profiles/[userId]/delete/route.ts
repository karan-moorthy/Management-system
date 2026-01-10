import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { AUTH_COOKIE } from "@/features/auth/constants";

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Get session from cookies
    const cookieHeader = request.headers.get("cookie") || "";
    console.log('[Profile Delete] Cookie header:', cookieHeader);
    
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [key, ...rest] = c.trim().split("=");
        return [key, rest.join("=")];
      })
    );
    
    console.log('[Profile Delete] All cookies:', Object.keys(cookies));
    const sessionToken = cookies[AUTH_COOKIE];

    console.log('[Profile Delete] Session token:', sessionToken ? 'Found' : 'Not found');

    if (!sessionToken) {
      console.error('[Profile Delete] No session token in cookies. Available cookies:', Object.keys(cookies));
      return NextResponse.json({ error: "Unauthorized - No session" }, { status: 401 });
    }

    console.log('[Profile Delete] Looking up session with token:', sessionToken.substring(0, 10) + '...');

    // Get user from session
    const sessions = await sql`
      SELECT user_id FROM sessions 
      WHERE session_token = ${sessionToken} 
      AND expires > NOW()
    `;

    console.log('[Profile Delete] Sessions found:', sessions.length);

    if (sessions.length === 0) {
      console.error('[Profile Delete] Session not found or expired. Token:', sessionToken.substring(0, 10) + '...');
      return NextResponse.json({ error: "Unauthorized - Invalid or expired session" }, { status: 401 });
    }

    const currentUserId = sessions[0].user_id;
    console.log('[Profile Delete] Current user ID:', currentUserId);

    // Check if current user is admin
    const members = await sql`
      SELECT role FROM members WHERE user_id = ${currentUserId}
    `;

    console.log('[Profile Delete] Members found:', members.length, 'Role:', members[0]?.role);

    if (members.length === 0) {
      return NextResponse.json({ error: "Forbidden - User not a member" }, { status: 403 });
    }

    const role = members[0].role;

    // Only ADMIN can delete profiles
    if (role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can delete profiles" },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (userId === currentUserId) {
      return NextResponse.json(
        { error: "Cannot delete your own profile" },
        { status: 400 }
      );
    }

    // Check if user exists
    const users = await sql`
      SELECT id, name, email FROM users WHERE id = ${userId}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userToDelete = users[0];

    console.log('[Profile Delete] Starting deletion process for user:', userToDelete.name);

    // Delete related data in correct order (respecting foreign key constraints)
    try {
      // 1. Clear all sessions (log them out)
      const sessionResult = await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
      console.log('[Profile Delete] Deleted sessions:', sessionResult.count);

      // 2. Clear notifications
      const notifResult = await sql`DELETE FROM notifications WHERE user_id = ${userId}`;
      console.log('[Profile Delete] Deleted notifications:', notifResult.count);

      // 3. Clear attendance records
      const attendanceResult = await sql`DELETE FROM attendance WHERE user_id = ${userId}`;
      console.log('[Profile Delete] Deleted attendance:', attendanceResult.count);

      // 4. Clear weekly reports
      const reportResult = await sql`DELETE FROM weekly_reports WHERE user_id = ${userId}`;
      console.log('[Profile Delete] Deleted weekly reports:', reportResult.count);

      // 5. Clear activity logs
      const activityResult = await sql`DELETE FROM activity_logs WHERE user_id = ${userId}`;
      console.log('[Profile Delete] Deleted activity logs:', activityResult.count);

      // 6. Clear invitations sent by this user
      const inviteResult = await sql`DELETE FROM invitations WHERE invited_by = ${userId}`;
      console.log('[Profile Delete] Deleted invitations:', inviteResult.count);

      // 7. Clear client invitations
      const clientInviteResult = await sql`DELETE FROM client_invitations WHERE invited_by = ${userId}`;
      console.log('[Profile Delete] Deleted client invitations:', clientInviteResult.count);

      // 8. Clear bug comments
      const bugCommentResult = await sql`DELETE FROM bug_comments WHERE user_id = ${userId}`;
      console.log('[Profile Delete] Deleted bug comments:', bugCommentResult.count);

      // 9. Update tasks to remove assignee (preserve task history)
      const taskResult = await sql`UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ${userId}`;
      console.log('[Profile Delete] Updated tasks (removed assignee):', taskResult.count);

      // 10. Update bugs to remove assignee
      const bugResult = await sql`UPDATE bugs SET assigned_to = NULL WHERE assigned_to = ${userId}`;
      console.log('[Profile Delete] Updated bugs (removed assignee):', bugResult.count);

      // 11. Update requirements to remove project manager
      const reqResult = await sql`UPDATE project_requirements SET project_manager_id = NULL WHERE project_manager_id = ${userId}`;
      console.log('[Profile Delete] Updated requirements (removed PM):', reqResult.count);

      // 12. Delete workspace and member memberships
      const memberResult = await sql`DELETE FROM members WHERE user_id = ${userId}`;
      console.log('[Profile Delete] Deleted member records:', memberResult.count);

      // 13. Finally, delete the user account
      const userResult = await sql`DELETE FROM users WHERE id = ${userId}`;
      console.log('[Profile Delete] Deleted user account:', userResult.count);

      console.log('[Profile Delete] Successfully completed deletion for:', userToDelete.email);

    } catch (deleteError) {
      console.error('[Profile Delete] Error during deletion:', deleteError);
      throw new Error(`Deletion failed: ${deleteError instanceof Error ? deleteError.message : 'Unknown error'}`);
    }

    return NextResponse.json({
      success: true,
      message: "Profile and all associated data deleted successfully",
      userId: userId,
    });
  } catch (error) {
    console.error("[Profile Delete] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete profile" },
      { status: 500 }
    );
  }
}
