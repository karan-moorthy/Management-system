import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql_client } from "@/db";
import { AUTH_COOKIE } from "@/features/auth/constants";

export async function PATCH(req: NextRequest) {
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

    // Mark all notifications as read
    await sql_client`
      UPDATE notifications 
      SET is_read = 'true', read_at = NOW() 
      WHERE user_id = ${userId} AND is_read = 'false'
    `;

    return NextResponse.json({ 
      success: true, 
      message: "All notifications marked as read" 
    });
  } catch (error) {
    console.error("[Mark All Read] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
