import { db } from "@/db";
import { workspaces, members } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { getCurrent } from "@/features/auth/queries";

export const getWorkspaces = async () => {
  try {
    const user = await getCurrent();

    if (!user) {
      return { documents: [], total: 0 };
    }

    const userMembers = await db
      .select()
      .from(members)
      .where(eq(members.userId, user.id));

    if (userMembers.length === 0) {
      return { documents: [], total: 0 };
    }

    const workspaceIds = userMembers.map((member) => member.workspaceId);

    if (workspaceIds.length === 0) {
      return { documents: [], total: 0 };
    }

    const userWorkspaces = await db
      .select()
      .from(workspaces)
      .where(inArray(workspaces.id, workspaceIds))
      .orderBy(desc(workspaces.createdAt));

    return { documents: userWorkspaces, total: userWorkspaces.length };
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return { documents: [], total: 0 };
  }
};
