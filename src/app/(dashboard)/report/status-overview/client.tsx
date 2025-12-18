"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download,
  Filter,
  ArrowLeft,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useIsGlobalAdmin } from "@/features/members/api/use-get-user-role";
import { Task, TaskStatus } from "@/features/tasks/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_COLORS = {
  [TaskStatus.TODO]: "#94a3b8",
  [TaskStatus.IN_PROGRESS]: "#3b82f6",
  [TaskStatus.IN_REVIEW]: "#f59e0b",
  [TaskStatus.DONE]: "#10b981",
  [TaskStatus.BACKLOG]: "#6b7280",
};

export const StatusOverviewClient = () => {
  const { data: isAdmin } = useIsGlobalAdmin();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  
  const { data: tasksData } = useGetTasks({ limit: 2000 });
  const { data: projectsData } = useGetProjects({});
  const { data: membersData } = useGetMembers({});
  
  const allTasks = (tasksData?.documents as Task[]) || [];
  const projects = (projectsData?.documents || []) as any[];
  const members = (membersData?.documents || []) as any[];

  // Apply filters
  const tasks = useMemo(() => {
    let filtered = [...allTasks];
    
    if (selectedProject !== "all") {
      filtered = filtered.filter((task) => task.projectId === selectedProject);
    }
    
    if (selectedAssignee !== "all") {
      filtered = filtered.filter((task) => task.assigneeId === selectedAssignee);
    }
    
    return filtered;
  }, [allTasks, selectedProject, selectedAssignee]);

  // Calculate status distribution
  const statusData = [
    { 
      name: "To Do", 
      value: tasks.filter((t) => t.status === TaskStatus.TODO).length,
      color: STATUS_COLORS[TaskStatus.TODO]
    },
    { 
      name: "In Progress", 
      value: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
      color: STATUS_COLORS[TaskStatus.IN_PROGRESS]
    },
    { 
      name: "In Review", 
      value: tasks.filter((t) => t.status === TaskStatus.IN_REVIEW).length,
      color: STATUS_COLORS[TaskStatus.IN_REVIEW]
    },
    { 
      name: "Done", 
      value: tasks.filter((t) => t.status === TaskStatus.DONE).length,
      color: STATUS_COLORS[TaskStatus.DONE]
    },
    { 
      name: "Backlog", 
      value: tasks.filter((t) => t.status === TaskStatus.BACKLOG).length,
      color: STATUS_COLORS[TaskStatus.BACKLOG]
    },
  ].filter(item => item.value > 0);

  const totalTasks = tasks.length;

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Status Overview Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "PPP")}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [["Status", "Count", "Percentage"]],
      body: statusData.map(item => [
        item.name,
        item.value.toString(),
        `${((item.value / totalTasks) * 100).toFixed(1)}%`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`status-overview-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    const data = [
      ["Status Overview Report"],
      [`Generated: ${format(new Date(), "PPP")}`],
      [""],
      ["Status", "Count", "Percentage"],
      ...statusData.map(item => [
        item.name,
        item.value,
        `${((item.value / totalTasks) * 100).toFixed(1)}%`
      ]),
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Status Overview");
    
    XLSX.writeFile(workbook, `status-overview-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/report">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-semibold">Status Overview</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Distribution of issues across different statuses
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToPDF} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button onClick={exportToExcel} size="sm">
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" />
              <span className="font-medium text-sm">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                  <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignees</SelectItem>
                      {members.map((member: any) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {(selectedProject !== "all" || selectedAssignee !== "all") && (
              <div className="mt-4 flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {tasks.length} of {allTasks.length} issues
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedProject("all");
                    setSelectedAssignee("all");
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statusData.map((status) => (
            <Card key={status.name}>
              <CardContent className="p-4">
                <div className="text-center">
                  <div 
                    className="w-3 h-3 rounded-full mx-auto mb-2" 
                    style={{ backgroundColor: status.color }}
                  />
                  <p className="text-2xl font-bold">{status.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{status.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {((status.value / totalTasks) * 100).toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon className="h-5 w-5" />
                <h3 className="font-semibold">Status Distribution</h3>
              </div>
              <div className="relative w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5" />
                <h3 className="font-semibold">Issue Count by Status</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Detailed Status Breakdown</h3>
            <div className="space-y-4">
              {statusData.map((status) => (
                <div key={status.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm" 
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="font-medium">{status.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {status.value} issues ({((status.value / totalTasks) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all rounded-full"
                      style={{ 
                        width: `${(status.value / totalTasks) * 100}%`,
                        backgroundColor: status.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
