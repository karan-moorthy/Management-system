"use client";

import { JiraDashboard } from "@/components/jira-dashboard";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { Task, TaskStatus } from "@/features/tasks/types";

export const ReportClient = () => {
  const { data: tasksData } = useGetTasks({ limit: 2000 });
  const { data: projects } = useGetProjects({});
  
  const tasks = (tasksData?.documents as Task[]) || [];

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text("Project Management Report", 14, 20);
    
    // Summary Statistics
    doc.setFontSize(12);
    doc.text("Summary Statistics", 14, 35);
    
    autoTable(doc, {
      startY: 45,
      head: [["Metric", "Value"]],
      body: [
        ["Total Tasks", tasks.length.toString()],
        ["Completed Tasks", tasks.filter(t => t.status === TaskStatus.DONE).length.toString()],
        ["In Progress", tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length.toString()],
        ["To Do", tasks.filter(t => t.status === TaskStatus.TODO).length.toString()],
        ["Total Projects", projects?.documents?.length.toString() || "0"],
      ],
    });
    
    // Task Status Distribution
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.text("Task Status Distribution", 14, finalY + 15);
    
    autoTable(doc, {
      startY: finalY + 25,
      head: [["Status", "Count", "Percentage"]],
      body: [
        ["To Do", tasks.filter(t => t.status === TaskStatus.TODO).length.toString(), `${((tasks.filter(t => t.status === TaskStatus.TODO).length / tasks.length) * 100).toFixed(1)}%`],
        ["In Progress", tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length.toString(), `${((tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length / tasks.length) * 100).toFixed(1)}%`],
        ["Done", tasks.filter(t => t.status === TaskStatus.DONE).length.toString(), `${((tasks.filter(t => t.status === TaskStatus.DONE).length / tasks.length) * 100).toFixed(1)}%`],
      ],
    });
    
    doc.save(`report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Summary Sheet
    const summaryData = [
      ["Project Management Report"],
      [""],
      ["Metric", "Value"],
      ["Total Tasks", tasks.length],
      ["Completed Tasks", tasks.filter(t => t.status === TaskStatus.DONE).length],
      ["In Progress", tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length],
      ["To Do", tasks.filter(t => t.status === TaskStatus.TODO).length],
      ["Total Projects", projects?.documents?.length || 0],
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    
    // Task Details Sheet
    const taskDetailsData = [
      ["Summary", "Status", "Priority", "Project", "Assignee", "Due Date"],
      ...tasks.map(task => [
        task.summary || "",
        task.status || "",
        task.priority || "",
        task.project?.name || "",
        task.assignee?.name || "",
        task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
      ]),
    ];
    
    const taskDetailsSheet = XLSX.utils.aoa_to_sheet(taskDetailsData);
    XLSX.utils.book_append_sheet(workbook, taskDetailsSheet, "Tasks");
    
    XLSX.writeFile(workbook, `report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Monitor all of your projects and tasks here.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToPDF} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>
      <JiraDashboard />
    </div>
  );
};
