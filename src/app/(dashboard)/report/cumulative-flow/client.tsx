"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, ArrowLeft, Activity } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format, subDays } from "date-fns";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { Task, TaskStatus } from "@/features/tasks/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const CumulativeFlowClient = () => {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [duration, setDuration] = useState<string>("30");
  
  const { data: tasksData } = useGetTasks({ limit: 2000 });
  const { data: projectsData } = useGetProjects({});
  
  const allTasks = (tasksData?.documents as Task[]) || [];
  const projects = (projectsData?.documents || []) as any[];

  const tasks = useMemo(() => {
    let filtered = [...allTasks];
    if (selectedProject !== "all") {
      filtered = filtered.filter((task) => task.projectId === selectedProject);
    }
    return filtered;
  }, [allTasks, selectedProject]);

  const flowData = useMemo(() => {
    const days = parseInt(duration);
    const today = new Date();
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const currentDay = subDays(today, i);
      
      // Count tasks that existed at this point in time
      const tasksAtThisPoint = tasks.filter(t => {
        const created = new Date(t.created);
        return created <= currentDay;
      });
      
      // For accurate cumulative flow, we track current status
      // (In real app, you'd need status history. This shows current state.)
      const todo = tasksAtThisPoint.filter(t => 
        t.status === TaskStatus.TODO || t.status === TaskStatus.BACKLOG
      ).length;
      
      const inProgress = tasksAtThisPoint.filter(t => 
        t.status === TaskStatus.IN_PROGRESS
      ).length;
      
      const inReview = tasksAtThisPoint.filter(t => 
        t.status === TaskStatus.IN_REVIEW
      ).length;
      
      const done = tasksAtThisPoint.filter(t => {
        if (t.status !== TaskStatus.DONE) return false;
        const completedDate = new Date(t.updated || t.created);
        return completedDate <= currentDay;
      }).length;
      
      data.push({
        date: format(currentDay, "MMM dd"),
        "To Do": todo,
        "In Progress": inProgress,
        "In Review": inReview,
        "Done": done,
      });
    }
    
    return data;
  }, [tasks, duration]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Cumulative Flow Diagram", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "PPP")}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [["Date", "To Do", "In Progress", "In Review", "Done"]],
      body: flowData.map(d => [
        d.date,
        d["To Do"].toString(),
        d["In Progress"].toString(),
        d["In Review"].toString(),
        d["Done"].toString()
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`cumulative-flow-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["Cumulative Flow Diagram"],
      [`Generated: ${format(new Date(), "PPP")}`],
      [""],
      ["Date", "To Do", "In Progress", "In Review", "Done"],
      ...flowData.map(d => [d.date, d["To Do"], d["In Progress"], d["In Review"], d["Done"]]),
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Cumulative Flow");
    XLSX.writeFile(workbook, `cumulative-flow-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
                <h1 className="text-2xl font-semibold">Cumulative Flow Diagram</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Visualize work item flow over time
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
                <label className="text-xs font-medium text-muted-foreground">Duration</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="60">Last 60 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5" />
              <h3 className="font-semibold">Flow Diagram</h3>
            </div>
            <ResponsiveContainer width="100%" height={500}>
              <AreaChart data={flowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="Done" stackId="1" stroke="#10b981" fill="#10b981" />
                <Area type="monotone" dataKey="In Review" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                <Area type="monotone" dataKey="In Progress" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                <Area type="monotone" dataKey="To Do" stackId="1" stroke="#94a3b8" fill="#94a3b8" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="w-3 h-3 rounded-full bg-[#94a3b8] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">To Do</p>
                <p className="text-2xl font-bold mt-1">
                  {flowData[flowData.length - 1]?.["To Do"] || 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="w-3 h-3 rounded-full bg-[#3b82f6] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold mt-1">
                  {flowData[flowData.length - 1]?.["In Progress"] || 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="w-3 h-3 rounded-full bg-[#f59e0b] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">In Review</p>
                <p className="text-2xl font-bold mt-1">
                  {flowData[flowData.length - 1]?.["In Review"] || 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="w-3 h-3 rounded-full bg-[#10b981] mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Done</p>
                <p className="text-2xl font-bold mt-1">
                  {flowData[flowData.length - 1]?.["Done"] || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
