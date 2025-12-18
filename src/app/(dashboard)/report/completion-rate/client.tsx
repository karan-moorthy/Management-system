"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, ArrowLeft, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { Task, TaskStatus } from "@/features/tasks/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const CompletionRateClient = () => {
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

  const completionData = useMemo(() => {
    const days = parseInt(duration);
    const today = new Date();
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const currentDay = subDays(today, i);
      
      const totalCreated = tasks.filter(t => {
        const created = new Date(t.created);
        return created <= currentDay;
      }).length;
      
      const completed = tasks.filter(t => {
        if (t.status !== TaskStatus.DONE) return false;
        const completedDate = new Date(t.updated || t.created);
        return completedDate <= currentDay;
      }).length;
      
      const rate = totalCreated > 0 ? Math.round((completed / totalCreated) * 100) : 0;
      
      data.push({
        date: format(currentDay, "MMM dd"),
        completed,
        total: totalCreated,
        rate,
      });
    }
    
    return data;
  }, [tasks, duration]);

  const currentRate = completionData[completionData.length - 1]?.rate || 0;
  const avgRate = completionData.length > 0 
    ? Math.round(completionData.reduce((sum, d) => sum + d.rate, 0) / completionData.length)
    : 0;

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Completion Rate Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "PPP")}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [["Date", "Completed", "Total", "Rate"]],
      body: completionData.map(d => [
        d.date,
        d.completed.toString(),
        d.total.toString(),
        `${d.rate}%`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`completion-rate-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["Completion Rate Report"],
      [`Generated: ${format(new Date(), "PPP")}`],
      [""],
      ["Current Rate", `${currentRate}%`],
      ["Average Rate", `${avgRate}%`],
      [""],
      ["Date", "Completed", "Total", "Rate"],
      ...completionData.map(d => [d.date, d.completed, d.total, `${d.rate}%`]),
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Completion Rate");
    XLSX.writeFile(workbook, `completion-rate-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
                <h1 className="text-2xl font-semibold">Completion Rate</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Track completion trends over time
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">Current Rate</p>
                <p className="text-5xl font-bold mt-2">{currentRate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Average Rate</p>
                <p className="text-5xl font-bold mt-2">{avgRate}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Completed Issues</p>
                <p className="text-5xl font-bold mt-2">
                  {completionData[completionData.length - 1]?.completed || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Completion Rate Trend</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} name="Completion Rate (%)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Issues Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total Created" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
