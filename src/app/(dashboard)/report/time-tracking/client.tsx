"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, ArrowLeft, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { Task, TaskPriority, TaskStatus } from "@/features/tasks/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export const TimeTrackingClient = () => {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<string>("project");
  
  const { data: tasksData } = useGetTasks({ limit: 2000 });
  const { data: projectsData } = useGetProjects({});
  const { data: membersData } = useGetMembers({});
  
  const allTasks = (tasksData?.documents as Task[]) || [];
  const projects = (projectsData?.documents || []) as any[];
  const members = (membersData?.documents || []) as any[];

  const tasks = useMemo(() => {
    let filtered = [...allTasks];
    if (selectedProject !== "all") {
      filtered = filtered.filter((task) => task.projectId === selectedProject);
    }
    return filtered;
  }, [allTasks, selectedProject]);

  // Simulate time tracking data (in real app, this would come from actual time logs)
  const timeData = useMemo(() => {
    if (groupBy === "project") {
      const projectTimes: Record<string, number> = {};
      tasks.forEach(task => {
        const project = projects.find(p => p.id === task.projectId);
        const projectName = project?.name || "Unknown";
        // Estimate time based on task priority and status (deterministic)
        let estimatedTime = 4; // base 4 hours
        if (task.priority === TaskPriority.HIGH) estimatedTime += 3;
        else if (task.priority === TaskPriority.MEDIUM) estimatedTime += 2;
        else if (task.priority === TaskPriority.LOW) estimatedTime += 1;
        
        if (task.status === TaskStatus.DONE) estimatedTime += 1; // completed tasks had more time
        
        projectTimes[projectName] = (projectTimes[projectName] || 0) + estimatedTime;
      });
      return Object.entries(projectTimes).map(([name, hours]) => ({
        name,
        hours,
        percentage: 0, // Will calculate below
      }));
    } else {
      const assigneeTimes: Record<string, number> = {};
      tasks.forEach(task => {
        const member = members.find(m => m.userId === task.assigneeId);
        const assigneeName = member?.name || "Unassigned";
        
        let estimatedTime = 4;
        if (task.priority === TaskPriority.HIGH) estimatedTime += 3;
        else if (task.priority === TaskPriority.MEDIUM) estimatedTime += 2;
        else if (task.priority === TaskPriority.LOW) estimatedTime += 1;
        
        if (task.status === TaskStatus.DONE) estimatedTime += 1;
        
        assigneeTimes[assigneeName] = (assigneeTimes[assigneeName] || 0) + estimatedTime;
      });
      return Object.entries(assigneeTimes).map(([name, hours]) => ({
        name,
        hours,
        percentage: 0,
      }));
    }
  }, [tasks, projects, members, groupBy]);

  const totalHours = timeData.reduce((sum, item) => sum + item.hours, 0);
  timeData.forEach(item => {
    item.percentage = totalHours > 0 ? Math.round((item.hours / totalHours) * 100) : 0;
  });

  const avgHoursPerTask = tasks.length > 0 ? Math.round(totalHours / tasks.length * 10) / 10 : 0;

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Time Tracking Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "PPP")}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [[groupBy === "project" ? "Project" : "Assignee", "Hours", "Percentage"]],
      body: timeData.map(d => [
        d.name,
        d.hours.toString(),
        `${d.percentage}%`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`time-tracking-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["Time Tracking Report"],
      [`Generated: ${format(new Date(), "PPP")}`],
      [""],
      ["Total Hours", totalHours],
      ["Total Issues", tasks.length],
      ["Avg Hours/Issue", avgHoursPerTask],
      [""],
      [groupBy === "project" ? "Project" : "Assignee", "Hours", "Percentage"],
      ...timeData.map(d => [d.name, d.hours, `${d.percentage}%`]),
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Time Tracking");
    XLSX.writeFile(workbook, `time-tracking-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="min-h-full bg-background">
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
                <h1 className="text-2xl font-semibold">Time Tracking</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyze time allocation across projects and team members
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" />
              <span className="font-medium text-sm">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Group By</label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="assignee">Assignee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-5xl font-bold mt-2">{totalHours}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-5xl font-bold mt-2">{tasks.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Avg Hours/Issue</p>
                <p className="text-5xl font-bold mt-2">{avgHoursPerTask}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Time Distribution (Bar Chart)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#3b82f6" name="Hours" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Time Distribution (Pie Chart)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={timeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="hours"
                  >
                    {timeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Detailed Breakdown</h3>
            <div className="space-y-4">
              {timeData.map((item, index) => (
                <div key={index} className="border-b pb-3 last:border-0">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.hours} hours • {item.percentage}% of total
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: COLORS[index % COLORS.length]
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
