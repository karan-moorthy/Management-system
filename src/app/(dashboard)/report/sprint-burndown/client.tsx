"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, ArrowLeft, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { Task, TaskStatus } from "@/features/tasks/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const SprintBurndownClient = () => {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [sprintDuration, setSprintDuration] = useState<string>("14");
  
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

  // Generate burndown data
  const burndownData = useMemo(() => {
    const days = parseInt(sprintDuration);
    const today = new Date();
    const sprintStart = subDays(today, days);
    
    const data = [];
    const totalTasks = tasks.length;
    
    for (let i = 0; i <= days; i++) {
      const currentDay = subDays(today, days - i);
      const completedByDay = tasks.filter(t => 
        t.status === TaskStatus.DONE && 
        new Date(t.updated || t.created) <= currentDay
      ).length;
      
      const remaining = totalTasks - completedByDay;
      const ideal = totalTasks - (totalTasks / days) * i;
      
      data.push({
        day: `Day ${i}`,
        date: format(currentDay, "MMM dd"),
        remaining: remaining,
        ideal: Math.round(ideal),
      });
    }
    
    return data;
  }, [tasks, sprintDuration]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Sprint Burndown Chart", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "PPP")}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [["Day", "Date", "Remaining", "Ideal"]],
      body: burndownData.map(d => [d.day, d.date, d.remaining.toString(), d.ideal.toString()]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`sprint-burndown-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["Sprint Burndown Chart"],
      [`Generated: ${format(new Date(), "PPP")}`],
      [""],
      ["Day", "Date", "Remaining Tasks", "Ideal Burndown"],
      ...burndownData.map(d => [d.day, d.date, d.remaining, d.ideal]),
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sprint Burndown");
    XLSX.writeFile(workbook, `sprint-burndown-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
                <h1 className="text-2xl font-semibold">Sprint Burndown Chart</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Track work remaining in the sprint
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
                <label className="text-xs font-medium text-muted-foreground">Sprint Duration (Days)</label>
                <Select value={sprintDuration} onValueChange={setSprintDuration}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">1 Week (7 days)</SelectItem>
                    <SelectItem value="14">2 Weeks (14 days)</SelectItem>
                    <SelectItem value="21">3 Weeks (21 days)</SelectItem>
                    <SelectItem value="30">1 Month (30 days)</SelectItem>
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
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-3xl font-bold mt-2">{tasks.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold mt-2 text-green-500">
                  {tasks.filter(t => t.status === TaskStatus.DONE).length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-3xl font-bold mt-2 text-orange-500">
                  {burndownData[burndownData.length - 1]?.remaining || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5" />
              <h3 className="font-semibold">Burndown Chart</h3>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="remaining" stroke="#f97316" strokeWidth={2} name="Actual" />
                <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Ideal" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
