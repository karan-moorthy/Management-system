"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { FileDown, FileSpreadsheet } from "lucide-react";

import { DashboardCharts } from "@/components/dashboard-charts";
import { Analytics } from "@/components/analytics";
import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useGetWorkspaceAnalytics } from "@/features/workspaces/api/use-get-workspace-analytics";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Task, TaskStatus } from "@/features/tasks/types";
import { Project } from "@/features/projects/types";
import { format } from "date-fns";

export const ReportClient = () => {
  const workspaceId = useWorkspaceId();
  const [isExporting, setIsExporting] = useState(false);

  const { data: analytics, isLoading: isLoadingAnalytics } =
    useGetWorkspaceAnalytics({ workspaceId });
  const { data: tasksData, isLoading: isLoadingTasks } = useGetTasks({ workspaceId, limit: 2000 });
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjects({ workspaceId });
  const { data: membersData, isLoading: isLoadingMembers } = useGetMembers({ workspaceId });

  const isLoading = isLoadingAnalytics || isLoadingTasks || isLoadingProjects || isLoadingMembers;

  if (isLoading) {
    return <PageLoader />;
  }

  if (!analytics || !tasksData || !projectsData || !membersData) {
    return <PageError message="Failed to load report data." />;
  }

  const tasks = (tasksData.documents as Task[]) || [];
  const projects = (projectsData.documents as Project[]) || [];

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text("Workspace Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), "PPP")}`, 14, 28);

      // Summary Statistics
      doc.setFontSize(14);
      doc.text("Summary Statistics", 14, 40);
      autoTable(doc, {
        startY: 45,
        head: [["Metric", "Value"]],
        body: [
          ["Total Tasks", analytics.taskCount.toString()],
          ["Assigned Tasks", analytics.assignedTaskCount.toString()],
          ["Completed Tasks", analytics.completedTaskCount.toString()],
          ["Overdue Tasks", analytics.overdueTaskCount.toString()],
          ["Incomplete Tasks", analytics.incompleteTaskCount.toString()],
        ],
      });

      // Task Status Distribution
      const tasksByStatus = [
        { status: "To Do", count: tasks.filter((t) => t.status === TaskStatus.TODO).length },
        { status: "In Progress", count: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length },
        { status: "In Review", count: tasks.filter((t) => t.status === TaskStatus.IN_REVIEW).length },
        { status: "Done", count: tasks.filter((t) => t.status === TaskStatus.DONE).length },
        { status: "Backlog", count: tasks.filter((t) => t.status === TaskStatus.BACKLOG).length },
      ];

      doc.setFontSize(14);
      doc.text("Task Status Distribution", 14, (doc as any).lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [["Status", "Count"]],
        body: tasksByStatus.map((item) => [item.status, item.count.toString()]),
      });

      // Project Progress
      const projectProgress = projects.map((project) => {
        const projectTasks = tasks.filter((t) => t.projectId === project.id);
        const completedTasks = projectTasks.filter((t) => t.status === TaskStatus.DONE).length;
        const totalTasks = projectTasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        return {
          name: project.name,
          completed: completedTasks,
          total: totalTasks,
          progress: `${progress}%`,
        };
      });

      if ((doc as any).lastAutoTable.finalY + 40 > 270) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Project Progress", 14, 20);
        autoTable(doc, {
          startY: 25,
          head: [["Project", "Completed", "Total", "Progress"]],
          body: projectProgress.map((p) => [p.name, p.completed.toString(), p.total.toString(), p.progress]),
        });
      } else {
        doc.setFontSize(14);
        doc.text("Project Progress", 14, (doc as any).lastAutoTable.finalY + 15);
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [["Project", "Completed", "Total", "Progress"]],
          body: projectProgress.map((p) => [p.name, p.completed.toString(), p.total.toString(), p.progress]),
        });
      }

      // Save PDF
      doc.save(`workspace-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const workbook = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ["Workspace Report"],
        [`Generated: ${format(new Date(), "PPP")}`],
        [],
        ["Summary Statistics"],
        ["Metric", "Value"],
        ["Total Tasks", analytics.taskCount],
        ["Assigned Tasks", analytics.assignedTaskCount],
        ["Completed Tasks", analytics.completedTaskCount],
        ["Overdue Tasks", analytics.overdueTaskCount],
        ["Incomplete Tasks", analytics.incompleteTaskCount],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Task Status Sheet
      const statusData = [
        ["Task Status Distribution"],
        ["Status", "Count"],
        ["To Do", tasks.filter((t) => t.status === TaskStatus.TODO).length],
        ["In Progress", tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length],
        ["In Review", tasks.filter((t) => t.status === TaskStatus.IN_REVIEW).length],
        ["Done", tasks.filter((t) => t.status === TaskStatus.DONE).length],
        ["Backlog", tasks.filter((t) => t.status === TaskStatus.BACKLOG).length],
      ];
      const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
      XLSX.utils.book_append_sheet(workbook, statusSheet, "Status Distribution");

      // Project Progress Sheet
      const projectData = [
        ["Project Progress"],
        ["Project", "Completed", "Total", "Progress %"],
        ...projects.map((project) => {
          const projectTasks = tasks.filter((t) => t.projectId === project.id);
          const completedTasks = projectTasks.filter((t) => t.status === TaskStatus.DONE).length;
          const totalTasks = projectTasks.length;
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          return [project.name, completedTasks, totalTasks, progress];
        }),
      ];
      const projectSheet = XLSX.utils.aoa_to_sheet(projectData);
      XLSX.utils.book_append_sheet(workbook, projectSheet, "Project Progress");

      // Task Details Sheet
      const taskDetailsData = [
        ["Task Details"],
        ["Issue ID", "Summary", "Status", "Priority", "Project", "Assignee", "Created", "Updated"],
        ...tasks.slice(0, 500).map((task) => [
          task.issueId,
          task.summary,
          task.status,
          task.priority,
          task.projectName || "N/A",
          task.assignee?.name || "Unassigned",
          format(new Date(task.created), "yyyy-MM-dd"),
          format(new Date(task.updated), "yyyy-MM-dd"),
        ]),
      ];
      const taskDetailsSheet = XLSX.utils.aoa_to_sheet(taskDetailsData);
      XLSX.utils.book_append_sheet(workbook, taskDetailsSheet, "Task Details");

      // Export
      XLSX.writeFile(workbook, `workspace-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    } catch (error) {
      console.error("Excel export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header with Export Buttons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Workspace Report</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={exportToPDF}
                disabled={isExporting}
                variant="outline"
              >
                <FileDown className="size-4 mr-2" />
                Export PDF
              </Button>
              <Button
                onClick={exportToExcel}
                disabled={isExporting}
                variant="outline"
              >
                <FileSpreadsheet className="size-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Analytics Summary */}
      <Analytics data={analytics} />

      {/* Dashboard Charts */}
      <DashboardCharts showFilters={true} />
    </div>
  );
};
