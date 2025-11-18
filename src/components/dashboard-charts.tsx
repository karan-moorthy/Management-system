"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Filter } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { Task, TaskStatus } from "@/features/tasks/types";
import { Project } from "@/features/projects/types";

const COLORS = {
  [TaskStatus.TODO]: "#f59e0b",
  [TaskStatus.IN_PROGRESS]: "#3b82f6",
  [TaskStatus.IN_REVIEW]: "#8b5cf6",
  [TaskStatus.DONE]: "#10b981",
  [TaskStatus.BACKLOG]: "#6b7280",
};

interface DashboardChartsProps {
  showFilters?: boolean;
}

export const DashboardCharts = ({ showFilters = true }: DashboardChartsProps) => {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const { data: projects } = useGetProjects({});
  const { data: members } = useGetMembers({});
  const { data: tasksData } = useGetTasks({
    projectId: selectedProject !== "all" ? selectedProject : undefined,
    assigneeId: selectedEmployee !== "all" ? selectedEmployee : undefined,
    limit: 2000,
  });

  const tasks = (tasksData?.documents as Task[]) || [];

  // Process data for charts
  const tasksByStatus = [
    { name: "To Do", value: tasks.filter((t) => t.status === TaskStatus.TODO).length, color: COLORS[TaskStatus.TODO] },
    { name: "In Progress", value: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length, color: COLORS[TaskStatus.IN_PROGRESS] },
    { name: "In Review", value: tasks.filter((t) => t.status === TaskStatus.IN_REVIEW).length, color: COLORS[TaskStatus.IN_REVIEW] },
    { name: "Done", value: tasks.filter((t) => t.status === TaskStatus.DONE).length, color: COLORS[TaskStatus.DONE] },
    { name: "Backlog", value: tasks.filter((t) => t.status === TaskStatus.BACKLOG).length, color: COLORS[TaskStatus.BACKLOG] },
  ];

  // Project progress data
  const projectProgressData = (projects?.documents as Project[] || []).map((project) => {
    const projectTasks = tasks.filter((t) => t.projectId === project.id);
    const completedTasks = projectTasks.filter((t) => t.status === TaskStatus.DONE).length;
    const totalTasks = projectTasks.length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      name: project.name.length > 15 ? project.name.substring(0, 15) + "..." : project.name,
      completed: completedTasks,
      total: totalTasks,
      progress: Math.round(progress),
    };
  }).slice(0, 6); // Top 6 projects

  // Performance trend (last 7 days)
  const performanceTrendData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = format(date, "MM/dd");

    const completedOnDate = tasks.filter((t) => {
      if (!t.updated || t.status !== TaskStatus.DONE) return false;
      const taskDate = new Date(t.updated);
      return format(taskDate, "MM/dd") === dateStr;
    }).length;

    return {
      date: dateStr,
      completed: completedOnDate,
    };
  });

  // Recent activity (last 10 tasks updated)
  const recentActivity = [...tasks]
    .sort((a, b) => {
      const dateA = new Date(a.updated || a.created);
      const dateB = new Date(b.updated || b.created);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="size-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {(projects?.documents as Project[] || []).map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Employee</label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {(members?.documents || []).map((member: any) => (
                      <SelectItem key={member.$id} value={member.userId}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Bar Chart - Project Progress */}
        <Card className="col-span-1 lg:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
                <Bar dataKey="total" fill="#e5e7eb" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Task Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tasksByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => (value > 0 ? `${name}: ${value}` : "")}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tasksByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart and Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Line Chart - Performance Trend */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Performance Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Completed Tasks"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              ) : (
                recentActivity.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent/50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.summary}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {task.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(task.updated || task.created), "MMM dd, HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
