import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql_client } from "@/db";
import { AUTH_COOKIE } from "@/features/auth/constants";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(AUTH_COOKIE)?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from session
    const userResult = await sql_client`
      SELECT u.id 
      FROM sessions s
      INNER JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ${sessionToken}
      AND s.expires > NOW()
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userResult[0].id;
    const { id: notificationId } = await params;

    // Delete notification (only if it belongs to the user)
    await sql_client`
      DELETE FROM notifications 
      WHERE id = ${notificationId} AND user_id = ${userId}
    `;

    return NextResponse.json({ 
      success: true, 
      message: "Notification deleted" 
    });
  } catch (error) {
    console.error("[Delete Notification] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
