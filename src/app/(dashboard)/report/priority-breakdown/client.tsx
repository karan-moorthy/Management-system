"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter, ArrowLeft, Target } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { Task, TaskPriority } from "@/features/tasks/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRIORITY_COLORS = {
  [TaskPriority.HIGH]: "#ef4444",
  [TaskPriority.MEDIUM]: "#f59e0b",
  [TaskPriority.LOW]: "#10b981",
};

export const PriorityBreakdownClient = () => {
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

  const priorityData = useMemo(() => {
    return [
      { 
        name: "High", 
        value: tasks.filter((t) => t.priority === TaskPriority.HIGH).length,
        color: PRIORITY_COLORS[TaskPriority.HIGH]
      },
      { 
        name: "Medium", 
        value: tasks.filter((t) => t.priority === TaskPriority.MEDIUM).length,
        color: PRIORITY_COLORS[TaskPriority.MEDIUM]
      },
      { 
        name: "Low", 
        value: tasks.filter((t) => t.priority === TaskPriority.LOW).length,
        color: PRIORITY_COLORS[TaskPriority.LOW]
      },
      { 
        name: "None", 
        value: tasks.filter((t) => !t.priority).length,
        color: "#64748b"
      },
    ].filter(item => item.value > 0);
  }, [tasks]);

  const totalTasks = tasks.length;

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Priority Breakdown Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "PPP")}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [["Priority", "Count", "Percentage"]],
      body: priorityData.map(item => [
        item.name,
        item.value.toString(),
        `${((item.value / totalTasks) * 100).toFixed(1)}%`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`priority-breakdown-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const data = [
      ["Priority Breakdown Report"],
      [`Generated: ${format(new Date(), "PPP")}`],
      [""],
      ["Priority", "Count", "Percentage"],
      ...priorityData.map(item => [
        item.name,
        item.value,
        `${((item.value / totalTasks) * 100).toFixed(1)}%`
      ]),
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, "Priority Breakdown");
    XLSX.writeFile(workbook, `priority-breakdown-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
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
                <h1 className="text-2xl font-semibold">Priority Breakdown</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyze work prioritization
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {priorityData.map((priority) => (
            <Card key={priority.name}>
              <CardContent className="p-6">
                <div className="text-center">
                  <div 
                    className="w-3 h-3 rounded-full mx-auto mb-2" 
                    style={{ backgroundColor: priority.color }}
                  />
                  <p className="text-sm text-muted-foreground">{priority.name}</p>
                  <p className="text-3xl font-bold mt-2">{priority.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((priority.value / totalTasks) * 100).toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5" />
                <h3 className="font-semibold">Priority Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Priority Counts</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priorityData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Detailed Breakdown</h3>
            <div className="space-y-4">
              {priorityData.map((priority) => (
                <div key={priority.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm" 
                        style={{ backgroundColor: priority.color }}
                      />
                      <span className="font-medium">{priority.name} Priority</span>
                    </div>
                    <span className="text-muted-foreground">
                      {priority.value} issues ({((priority.value / totalTasks) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all rounded-full"
                      style={{ 
                        width: `${(priority.value / totalTasks) * 100}%`,
                        backgroundColor: priority.color
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
