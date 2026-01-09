import { db } from "@/db";
import { users, members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("jcn-jira-clone-session");
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "No session cookie found" }, { status: 401 });
    }

    // Get all users with their workspace memberships
    const allUsers = await db
      .select({
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        workspaceId: members.workspaceId,
        role: members.role,
      })
      .from(users)
      .leftJoin(members, eq(users.id, members.userId))
      .where(eq(users.email, 'varun@pms.com'));
    
    return NextResponse.json({ 
      varunData: allUsers,
      sessionCookie: sessionCookie.value.substring(0, 10) + "...",
      message: allUsers.length === 0 
        ? "Varun not found in users table"
        : allUsers[0].role === null
        ? "Varun exists but has no workspace membership"
        : `Varun has role: ${allUsers[0].role}`
    });
    
  } catch (error) {
    console.error('Error checking admin:', error);
    return NextResponse.json({ error: 'Failed to check admin status', details: String(error) }, { status: 500 });
  }
}
