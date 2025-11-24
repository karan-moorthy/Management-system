import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";
import { TaskOverviewsPanel } from "@/features/tasks/components/task-overviews-panel";
import { ExcelUploadCard } from "@/components/excel-upload-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, ListTodo, ClipboardCheck } from "lucide-react";
import { getMember } from "@/features/members/utils";
import { MemberRole } from "@/features/members/types";

const TasksPage = async ({ searchParams }: { searchParams: { tab?: string } }) => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");

  const defaultTab = searchParams.tab || "individual";

  // Check if user is admin in any workspace
  const isAdmin = await (async () => {
    try {
      const { db } = await import("@/db");
      const { members } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      
      const memberRole = await db.query.members.findFirst({
        where: eq(members.userId, user.id),
      });
      
      console.log(`🔍 Checking admin access for user: ${user.name} (${user.id})`);
      console.log(`📋 Member role found:`, memberRole);
      
      if (!memberRole) {
        console.log("❌ No member role found - not admin");
        return false;
      }
      
      const isAdminRole = [
        MemberRole.ADMIN,
        MemberRole.PROJECT_MANAGER,
        MemberRole.MANAGEMENT,
      ].includes(memberRole.role as MemberRole);
      
      console.log(`✅ Is admin: ${isAdminRole} (Role: ${memberRole.role})`);
      
      return isAdminRole;
    } catch (error) {
      console.error("❌ Error checking admin status:", error);
      return false;
    }
  })();

  console.log(`🎯 Final isAdmin value: ${isAdmin}`);

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-muted-foreground">
          Create individual tasks or import multiple tasks at once
        </p>
      </div>

      {/* Tabs for Individual vs Bulk Import */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className={`grid w-full max-w-2xl ${isAdmin ? 'grid-cols-3' : 'grid-cols-1'}`}>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Individual Tasks
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Bulk Import
              </TabsTrigger>
              <TabsTrigger value="overviews" className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Task Reviews
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Individual Tasks Tab */}
        <TabsContent value="individual" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Task Management</CardTitle>
              <CardDescription>
                Create, view, and manage tasks individually. Use filters to find specific tasks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Task View Switcher with Table, Kanban, Calendar views */}
              <TaskViewSwitcher />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Import Tab - Admin Only */}
        {isAdmin && (
        <TabsContent value="bulk" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Bulk Import Form */}
            <div className="lg:col-span-2">
              <ExcelUploadCard />
            </div>

            {/* Instructions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Required Steps:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Select a project from the dropdown</li>
                    <li>Optionally add default assignees</li>
                    <li>Upload your CSV file</li>
                    <li>Click Submit Import</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">CSV Format:</h4>
                  <p className="text-muted-foreground mb-2">
                    Your CSV should include these columns:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Epic</li>
                    <li>Story</li>
                    <li>Planned Start</li>
                    <li>Planned Completion</li>
                    <li>Responsibility</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">After Import:</h4>
                  <p className="text-muted-foreground">
                    View imported tasks in:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
                    <li><strong>Table View:</strong> List format with sorting</li>
                    <li><strong>Kanban View:</strong> Drag-and-drop boards</li>
                    <li><strong>Calendar View:</strong> Timeline visualization</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Filters Available:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>All Statuses (TODO, IN_PROGRESS, DONE, etc.)</li>
                    <li>All Assignees</li>
                    <li>All Projects</li>
                    <li>Due Date</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* View Results After Import */}
          <Card>
            <CardHeader>
              <CardTitle>Imported Tasks</CardTitle>
              <CardDescription>
                After importing, your tasks will appear here. Use the tabs to switch between views and filters to refine results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskViewSwitcher />
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Task Reviews Tab - Admin Only */}
        {isAdmin && (
        <TabsContent value="overviews" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Completion Reviews</CardTitle>
              <CardDescription>
                Review task completion overviews submitted by employees. Approve or request rework with feedback.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskOverviewsPanel />
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default TasksPage;
