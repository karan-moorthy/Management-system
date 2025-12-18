"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, ArrowLeft, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format, subDays } from "date-fns";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { Task, TaskStatus } from "@/features/tasks/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const VelocityClient = () => {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  
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

  // Generate velocity data for last 6 sprints (2 weeks each)
  const velocityData = useMemo(() => {
    const sprints = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const sprintEnd = subDays(today, i * 14);
      const sprintStart = subDays(sprintEnd, 14);
      
      const completed = tasks.filter(t => {
        if (t.status !== TaskStatus.DONE) return false;
        const completedDate = new Date(t.updated || t.created);
        return completedDate >= sprintStart && completedDate <= sprintEnd;
      }).length;
      
      const committed = tasks.filter(t => {
        const createdDate = new Date(t.created);
        return createdDate >= sprintStart && createdDate <= sprintEnd;
      }).length;
      
      sprints.push({
        sprint: `Sprint ${6 - i}`,
        date: format(sprintEnd, "MMM dd"),
        completed,
        committed,
      });
    }
    
    return sprints;
  }, [tasks]);

  const avgVelocity = Math.round(
    velocityData.reduce((sum, s) => sum + s.completed, 0) / velocityData.length
  );

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Velocity Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "PPP")}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [["Sprint", "Date", "Completed", "Committed"]],
      body: velocityData.map(d => [d.sprint, d.date, d.completed.toString(), d.committed.toString()]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`velocity-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["Velocity Report"],
      [`Generated: ${format(new Date(), "PPP")}`],
      [""],
      ["Sprint", "Date", "Completed", "Committed"],
      ...velocityData.map(d => [d.sprint, d.date, d.completed, d.committed]),
      [""],
      ["Average Velocity", avgVelocity],
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Velocity");
    XLSX.writeFile(workbook, `velocity-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
                <h1 className="text-2xl font-semibold">Velocity Report</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Track team velocity across sprints
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

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Zap className="h-12 w-12 mx-auto text-yellow-500 mb-2" />
              <p className="text-sm text-muted-foreground">Average Velocity</p>
              <p className="text-5xl font-bold mt-2">{avgVelocity}</p>
              <p className="text-xs text-muted-foreground mt-2">issues per sprint</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Velocity Trend</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sprint" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
                <Bar dataKey="committed" fill="#3b82f6" name="Committed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Sprint Details</h3>
            <div className="space-y-3">
              {velocityData.map((sprint) => (
                <div key={sprint.sprint} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{sprint.sprint}</p>
                    <p className="text-xs text-muted-foreground">{sprint.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm"><span className="font-medium">{sprint.completed}</span> completed</p>
                    <p className="text-xs text-muted-foreground">{sprint.committed} committed</p>
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
