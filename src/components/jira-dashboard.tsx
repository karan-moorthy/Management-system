"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Edit, 
  PlusSquare, 
  Calendar,
  Filter,
  Maximize2,
  Clock,
  Trash2,
  RefreshCw
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { Task, TaskStatus, TaskPriority } from "@/features/tasks/types";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_COLORS = {
  [TaskStatus.TODO]: "#10b981",
  [TaskStatus.IN_PROGRESS]: "#3b82f6",
  [TaskStatus.IN_REVIEW]: "#f59e0b",
  [TaskStatus.DONE]: "#6366f1",
  [TaskStatus.BACKLOG]: "#6b7280",
};

const PRIORITY_COLORS = {
  [TaskPriority.LOW]: "#10b981",
  [TaskPriority.MEDIUM]: "#f59e0b",
  [TaskPriority.HIGH]: "#ef4444",
};

export const JiraDashboard = () => {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  
  // Fetch more tasks to handle large CSV uploads (e.g., 1276 rows)
  // Note: For datasets > 2000, consider implementing pagination
  const { data: tasksData, isLoading: isLoadingTasks } = useGetTasks({ limit: 2000 });
  const { data: projectsData } = useGetProjects({});
  const { data: membersData } = useGetMembers({});
  
  const allTasks = (tasksData?.documents as Task[]) || [];
  const projects = (projectsData?.documents || []) as any[];
  const members = (membersData?.documents || []) as any[];

  // Debug: Log task statuses to see what values we're getting
  if (allTasks.length > 0 && allTasks.length <= 5) {
    console.log("Sample tasks from DB:", allTasks.map(t => ({ 
      id: t.id, 
      status: t.status, 
      assigneeId: t.assigneeId,
      projectId: t.projectId 
    })));
  } else if (allTasks.length > 5) {
    console.log("Sample task statuses:", allTasks.slice(0, 3).map(t => t.status));
    console.log("TaskStatus enum values:", {
      TODO: TaskStatus.TODO,
      IN_PROGRESS: TaskStatus.IN_PROGRESS,
      DONE: TaskStatus.DONE,
      BACKLOG: TaskStatus.BACKLOG,
      IN_REVIEW: TaskStatus.IN_REVIEW
    });
  }

  // Apply filters - filter the tasks based on selected criteria
  const tasks = useMemo(() => {
    let filtered = [...allTasks];
    
    console.log("Starting filter with", filtered.length, "tasks");
    
    if (selectedProject !== "all") {
      const beforeCount = filtered.length;
      filtered = filtered.filter((task) => task.projectId === selectedProject);
      console.log(`Project filter: ${beforeCount} -> ${filtered.length} (looking for projectId: ${selectedProject})`);
      if (filtered.length === 0 && beforeCount > 0) {
        console.log("Sample projectIds in data:", allTasks.slice(0, 3).map(t => t.projectId));
      }
    }
    
    if (selectedStatus !== "all") {
      const beforeCount = filtered.length;
      filtered = filtered.filter((task) => task.status === selectedStatus);
      console.log(`Status filter: ${beforeCount} -> ${filtered.length} (looking for status: "${selectedStatus}")`);
      if (filtered.length === 0 && beforeCount > 0) {
        console.log("Sample statuses in remaining tasks:", filtered.slice(0, 3).map(t => t.status));
      }
    }
    
    if (selectedAssignee !== "all") {
      const beforeCount = filtered.length;
      filtered = filtered.filter((task) => task.assigneeId === selectedAssignee);
      console.log(`Assignee filter: ${beforeCount} -> ${filtered.length} (looking for assigneeId: ${selectedAssignee})`);
      if (filtered.length === 0 && beforeCount > 0) {
        console.log("Sample assigneeIds in remaining tasks:", allTasks.slice(0, 3).map(t => t.assigneeId));
      }
    }
    
    console.log("Filtered tasks:", filtered.length, "out of", allTasks.length);
    console.log("Filters applied:", { selectedProject, selectedStatus, selectedAssignee });
    if (filtered.length > 0 && filtered.length < 5) {
      console.log("Sample filtered task:", {
        status: filtered[0].status,
        assigneeId: filtered[0].assigneeId,
        projectId: filtered[0].projectId
      });
    }
    
    return filtered;
  }, [allTasks, selectedProject, selectedStatus, selectedAssignee]);

  // Calculate stats
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const completedLast7Days = tasks.filter(
    (t) => t.status === TaskStatus.DONE && new Date(t.updated || t.created) >= sevenDaysAgo
  ).length;

  const updatedLast7Days = tasks.filter(
    (t) => new Date(t.updated || t.created) >= sevenDaysAgo
  ).length;

  const createdLast7Days = tasks.filter(
    (t) => new Date(t.created) >= sevenDaysAgo
  ).length;

  const dueSoon = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) && t.status !== TaskStatus.DONE
  ).length;

  // Status overview data - include all statuses
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
  ].filter(item => item.value > 0); // Only show statuses with tasks

  const totalWorkItems = tasks.length;

  // Priority breakdown data
  const priorityData = [
    { 
      name: "Highest", 
      value: 0, // Can be extended if you have HIGHEST priority
      color: "#dc2626" 
    },
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
      name: "Lowest", 
      value: 0,
      color: "#94a3b8"
    },
    { 
      name: "None", 
      value: tasks.filter((t) => !t.priority).length,
      color: "#64748b"
    },
  ];

  // Types of work - calculate based on all tasks
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;
  const inProgressTasks = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
  const todoTasks = tasks.filter((t) => t.status === TaskStatus.TODO).length;
  
  const taskPercentage = totalWorkItems > 0 ? Math.round((completedTasks / totalWorkItems) * 100) : 0;
  const inProgressPercentage = totalWorkItems > 0 ? Math.round((inProgressTasks / totalWorkItems) * 100) : 0;
  const todoPercentage = totalWorkItems > 0 ? Math.round((todoTasks / totalWorkItems) * 100) : 0;

  // Create detailed activity timeline
  // Recent Activity Data Basis:
  // 1. Created events: Generated from task.created timestamp when a task was first created
  // 2. Updated events: Generated from task.updated timestamp (only if different from created)
  // 3. Activities are based on FILTERED tasks (respects Project, Status, Assignee filters)
  // 4. Sorted by timestamp in descending order (newest first)
  // 5. Grouped by date: Today, Yesterday, or specific date (e.g., "November 17, 2025")
  // 6. Limited to 3 date groups, each showing up to 10 activities
  interface Activity {
    id: string;
    type: 'created' | 'updated' | 'status_changed';
    task: Task;
    timestamp: Date;
    oldValue?: string;
    newValue?: string;
  }

  const activities: Activity[] = useMemo(() => {
    const activityList: Activity[] = [];
    
    // Use filtered tasks instead of allTasks
    tasks.forEach((task) => {
      // Parse created timestamp safely - task.created is a string from the database
      const createdTimestamp = new Date(task.created);
      
      // Debug: Log the first task's timestamp info
      if (activityList.length === 0 && tasks.length > 0) {
        console.log('🕐 Timestamp Debug:', {
          rawCreated: task.created,
          parsedCreated: createdTimestamp,
          createdISO: createdTimestamp.toISOString(),
          currentTime: new Date(),
          currentISO: new Date().toISOString(),
          timeDiffMinutes: Math.round((new Date().getTime() - createdTimestamp.getTime()) / 1000 / 60),
          formatResult: formatDistanceToNow(createdTimestamp, { addSuffix: true })
        });
      }
      
      // Only add if timestamp is valid
      if (!isNaN(createdTimestamp.getTime())) {
        // Created activity
        activityList.push({
          id: `${task.id}-created`,
          type: 'created',
          task,
          timestamp: createdTimestamp,
        });
      }

      // Updated activity (if updated is different from created)
      if (task.updated && task.updated !== task.created) {
        const updatedTimestamp = new Date(task.updated);
          
        if (!isNaN(updatedTimestamp.getTime())) {
          activityList.push({
            id: `${task.id}-updated`,
            type: 'updated',
            task,
            timestamp: updatedTimestamp,
            newValue: task.status,
          });
        }
      }
    });

    // Sort by timestamp descending
    return activityList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [tasks]); // Changed dependency from allTasks to tasks

  // Group activities by date - limit to recent activities for performance
  const groupedActivities = useMemo(() => {
    const groups: { [key: string]: Activity[] } = {};
    
    // Only process the most recent 100 activities for performance
    const recentActivities = activities.slice(0, 100);
    
    recentActivities.forEach((activity) => {
      let groupKey: string;
      
      if (isToday(activity.timestamp)) {
        groupKey = 'Today';
      } else if (isYesterday(activity.timestamp)) {
        groupKey = 'Yesterday';
      } else {
        groupKey = format(activity.timestamp, 'MMMM d, yyyy');
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(activity);
    });
    
    return groups;
  }, [activities]);

  const getStatusBadgeColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case TaskStatus.IN_PROGRESS:
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case TaskStatus.IN_REVIEW:
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case TaskStatus.DONE:
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case TaskStatus.BACKLOG:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'created':
        return <PlusSquare className="size-4 text-blue-500" />;
      case 'updated':
        return <Edit className="size-4 text-purple-500" />;
      case 'status_changed':
        return <RefreshCw className="size-4 text-amber-500" />;
      default:
        return <Clock className="size-4" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    const taskName = activity.task.issueId || activity.task.summary || 'Task';
    const assigneeName = activity.task.assignee?.name || 'User';
    
    switch (activity.type) {
      case 'created':
        return (
          <>
            <span className="font-medium">{assigneeName}</span> created{" "}
            <a href={`/tasks/${activity.task.id}`} className="text-primary hover:underline font-medium">
              {taskName}
            </a>
          </>
        );
      case 'updated':
        return (
          <>
            <span className="font-medium">{assigneeName}</span> updated{" "}
            <a href={`/tasks/${activity.task.id}`} className="text-primary hover:underline font-medium">
              {taskName}
            </a>
            {activity.newValue && (
              <>
                {" "}to{" "}
                <Badge variant="outline" className={getStatusBadgeColor(activity.newValue as TaskStatus)}>
                  {activity.newValue}
                </Badge>
              </>
            )}
          </>
        );
      default:
        return (
          <>
            <span className="font-medium">{assigneeName}</span> modified{" "}
            <a href={`/tasks/${activity.task.id}`} className="text-primary hover:underline font-medium">
              {taskName}
            </a>
          </>
        );
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Filter Section */}
      <Card className="bg-card border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="size-4" />
            <span className="font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
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
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value={TaskStatus.TODO}>To Do</SelectItem>
                  <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={TaskStatus.IN_REVIEW}>In Review</SelectItem>
                  <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                  <SelectItem value={TaskStatus.BACKLOG}>Backlog</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Assignee</label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="All Assignees" />
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
          </div>
          <div className="flex items-center justify-between mt-3">
            {(selectedProject !== "all" || selectedStatus !== "all" || selectedAssignee !== "all") ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Showing {tasks.length} of {allTasks.length} tasks
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedProject("all");
                    setSelectedStatus("all");
                    setSelectedAssignee("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Showing all {allTasks.length} tasks
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoadingTasks ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="size-6 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold">{completedLast7Days} completed</p>
                    <p className="text-sm text-muted-foreground">In the last 7 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Edit className="size-6 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold">{updatedLast7Days} updated</p>
                    <p className="text-sm text-muted-foreground">In the last 7 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <PlusSquare className="size-6 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold">{createdLast7Days} created</p>
                    <p className="text-sm text-muted-foreground">In the last 7 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <Calendar className="size-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold">{dueSoon} due soon</p>
                    <p className="text-sm text-muted-foreground">In the next 7 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status Overview */}
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-lg">Status overview</CardTitle>
                <CardDescription>
                  Get an overview of the status of your work items.{" "}
                  <a href="#" className="text-primary hover:underline">View all work items</a>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative w-48 h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-bold">{totalWorkItems}</p>
                  <p className="text-xs text-muted-foreground">Total work item...</p>
                </div>
              </div>
                  <div className="space-y-3 flex-1">
                    {statusData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity - Shows task creation & updates from filtered tasks, sorted by timestamp */}
            <Card className="bg-card border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Recent activity</CardTitle>
                    <CardDescription>
                      Task creations and updates for existing tasks. Deleted tasks are not shown.
                    </CardDescription>
                  </div>
              <Button variant="ghost" size="icon">
                <Maximize2 className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {Object.entries(groupedActivities).slice(0, 3).map(([dateKey, dateActivities]) => (
                <div key={dateKey} className="space-y-2">
                  <div className="text-sm font-semibold flex items-center gap-2 sticky top-0 bg-card py-2">
                    <Clock className="size-4" />
                    {dateKey}
                  </div>
                  <div className="space-y-3">
                    {dateActivities.slice(0, 10).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 text-sm py-2 border-b last:border-0">
                        <div className="p-1.5 rounded-full bg-muted">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-muted-foreground leading-relaxed">
                            {getActivityText(activity)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(groupedActivities).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="size-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

            {/* Priority Breakdown */}
            <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-lg">Priority breakdown</CardTitle>
            <CardDescription>
              Get a holistic view of how work is being prioritized.{" "}
              <a href="#" className="text-primary hover:underline">
                How to manage priorities for spaces
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priorityData}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-4 flex-wrap text-xs">
              {priorityData.map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

            {/* Types of Work */}
            <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-lg">Types of work</CardTitle>
            <CardDescription>
              Get a breakdown of work items by their types.{" "}
              <a href="#" className="text-primary hover:underline">View all items</a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-green-500" />
                    <span>Completed</span>
                  </div>
                  <span className="font-medium">{completedTasks} ({taskPercentage}%)</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${taskPercentage}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="size-4 text-blue-500" />
                    <span>In Progress</span>
                  </div>
                  <span className="font-medium">{inProgressTasks} ({inProgressPercentage}%)</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${inProgressPercentage}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-amber-500" />
                    <span>To Do</span>
                  </div>
                  <span className="font-medium">{todoTasks} ({todoPercentage}%)</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${todoPercentage}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total Tasks</span>
                  <span className="text-lg font-bold">{totalWorkItems}</span>
                </div>
              </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </>
      )}
    </div>
  );
};
