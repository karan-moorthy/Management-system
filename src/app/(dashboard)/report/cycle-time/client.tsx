"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, ArrowLeft, Clock } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format, differenceInDays } from "date-fns";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { Task, TaskStatus } from "@/features/tasks/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const CycleTimeClient = () => {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  
  const { data: tasksData } = useGetTasks({ limit: 2000 });
  const { data: projectsData } = useGetProjects({});
  
  const allTasks = (tasksData?.documents as Task[]) || [];
  const projects = (projectsData?.documents || []) as any[];

  const tasks = useMemo(() => {
    let filtered = [...allTasks].filter(t => t.status === TaskStatus.DONE && t.updated);
    if (selectedProject !== "all") {
      filtered = filtered.filter((task) => task.projectId === selectedProject);
    }
    return filtered;
  }, [allTasks, selectedProject]);

  const cycleTimeData = useMemo(() => {
    return tasks.map((task, index) => {
      const created = new Date(task.created);
      const completed = new Date(task.updated!);
      const days = differenceInDays(completed, created);
      
      return {
        index: index + 1,
        days: days,
        issueId: task.issueId || task.summary?.substring(0, 20) || `Task ${index + 1}`,
        color: days > 14 ? "#ef4444" : days > 7 ? "#f59e0b" : "#10b981"
      };
    });
  }, [tasks]);

  const avgCycleTime = cycleTimeData.length > 0
    ? Math.round(cycleTimeData.reduce((sum, d) => sum + d.days, 0) / cycleTimeData.length)
    : 0;

  const median = cycleTimeData.length > 0
    ? cycleTimeData.sort((a, b) => a.days - b.days)[Math.floor(cycleTimeData.length / 2)]?.days || 0
    : 0;

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Cycle Time Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "PPP")}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [["Issue", "Cycle Time (Days)"]],
      body: cycleTimeData.slice(0, 50).map(d => [d.issueId, d.days.toString()]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`cycle-time-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["Cycle Time Report"],
      [`Generated: ${format(new Date(), "PPP")}`],
      [""],
      ["Average Cycle Time", `${avgCycleTime} days`],
      ["Median Cycle Time", `${median} days`],
      [""],
      ["Issue", "Cycle Time (Days)"],
      ...cycleTimeData.map(d => [d.issueId, d.days]),
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Cycle Time");
    XLSX.writeFile(workbook, `cycle-time-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
                <h1 className="text-2xl font-semibold">Cycle Time Report</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Time from start to completion
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
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-sm text-muted-foreground">Average Cycle Time</p>
                <p className="text-4xl font-bold mt-2">{avgCycleTime}</p>
                <p className="text-xs text-muted-foreground mt-1">days</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto text-cyan-500 mb-2" />
                <p className="text-sm text-muted-foreground">Median Cycle Time</p>
                <p className="text-4xl font-bold mt-2">{median}</p>
                <p className="text-xs text-muted-foreground mt-1">days</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-4xl font-bold mt-2">{cycleTimeData.length}</p>
                <p className="text-xs text-muted-foreground mt-1">completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Cycle Time Distribution</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" name="Issue" />
                <YAxis dataKey="days" name="Days" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={cycleTimeData} fill="#3b82f6">
                  {cycleTimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                <span>Fast (≤7 days)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <span>Average (8-14 days)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <span>Slow {`(>14 days)`}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
