import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { AdminWeeklyReports } from "@/features/weekly-reports/components/admin-weekly-reports";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MemberRole } from "@/features/members/types";

export default async function ReportDownloadPage() {
  const user = await getCurrent();

  if (!user) redirect("/sign-in");

  // Check if user is admin
  const memberRecords = await db
    .select()
    .from(members)
    .where(eq(members.userId, user.id));

  const isAdmin = memberRecords.some(
    (m) =>
      m.role === MemberRole.ADMIN ||
      m.role === MemberRole.PROJECT_MANAGER ||
      m.role === MemberRole.MANAGEMENT
  );

  // Redirect non-admins (employees) to weekly report submission page
  if (!isAdmin) {
    redirect("/weekly-report");
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report Download</h1>
          <p className="text-muted-foreground mt-1">
            Download employee weekly reports by department
          </p>
        </div>

        <AdminWeeklyReports />
      </div>
    </div>
  );
}
