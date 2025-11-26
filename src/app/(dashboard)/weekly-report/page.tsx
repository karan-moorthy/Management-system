import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { EmployeeWeeklyReportForm } from "@/features/weekly-reports/components/employee-weekly-report-form";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MemberRole } from "@/features/members/types";

export default async function WeeklyReportPage() {
  const user = await getCurrent();

  if (!user) redirect("/sign-in");

  // Check if user is employee (not admin)
  const memberRecords = await db
    .select()
    .from(members)
    .where(eq(members.userId, user.id));

  const isEmployee = memberRecords.some((m) => m.role === MemberRole.EMPLOYEE);
  const isAdmin = memberRecords.some(
    (m) =>
      m.role === MemberRole.ADMIN ||
      m.role === MemberRole.PROJECT_MANAGER ||
      m.role === MemberRole.MANAGEMENT
  );

  // Redirect admins to the reports download page
  if (isAdmin || !isEmployee) {
    redirect("/report-download");
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-background to-muted/20">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Report</h1>
          <p className="text-muted-foreground mt-1">
            Submit your weekly task report with daily descriptions
          </p>
        </div>

        <EmployeeWeeklyReportForm userDepartment={user.department || undefined} />
      </div>
    </div>
  );
}
