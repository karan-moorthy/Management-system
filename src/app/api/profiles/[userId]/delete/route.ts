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

    // Delete related data
    await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
    await sql`DELETE FROM members WHERE user_id = ${userId}`;
    await sql`DELETE FROM invitations WHERE email = ${userToDelete.email}`;
    await sql`DELETE FROM notifications WHERE user_id = ${userId}`;
    await sql`UPDATE tasks SET assignee_id = NULL WHERE assignee_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;

    return NextResponse.json({
      success: true,
      message: "Profile deleted successfully",
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
