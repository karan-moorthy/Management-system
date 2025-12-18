"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Zap,
  Target,
  Calendar,
  ArrowRight,
  FileBarChart
} from "lucide-react";
import Link from "next/link";

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
  route?: string;
}

const reportTypes: ReportCard[] = [
  {
    id: "status-overview",
    title: "Status Overview Report",
    description: "Get an overview of the status of your work items. View distribution across To Do, In Progress, In Review, and Done.",
    icon: <BarChart3 className="h-12 w-12" />,
    color: "text-blue-500",
    available: true,
    route: "/report/status-overview"
  },
  {
    id: "sprint-burndown",
    title: "Sprint Burndown Chart",
    description: "Track and manage the total work remaining within a sprint. Monitor team and individual performance.",
    icon: <TrendingDown className="h-12 w-12" />,
    color: "text-orange-500",
    available: true,
    route: "/report/sprint-burndown"
  },
  {
    id: "velocity",
    title: "Velocity Report",
    description: "Predict the amount of work your team can commit to in future sprints by reviewing the amount delivered in previous ones.",
    icon: <Zap className="h-12 w-12" />,
    color: "text-yellow-500",
    available: true,
    route: "/report/velocity"
  },
  {
    id: "cumulative-flow",
    title: "Cumulative Flow Diagram",
    description: "Shows the statuses of your project's work items over time. Identify bottlenecks in your workflow.",
    icon: <Activity className="h-12 w-12" />,
    color: "text-purple-500",
    available: true,
    route: "/report/cumulative-flow"
  },
  {
    id: "cycle-time",
    title: "Cycle Time Report",
    description: "Understand how much time it takes to ship work items through the deployment pipeline and how to deal with outliers.",
    icon: <Clock className="h-12 w-12" />,
    color: "text-cyan-500",
    available: true,
    route: "/report/cycle-time"
  },
  {
    id: "priority-breakdown",
    title: "Priority Breakdown Report",
    description: "Get a holistic view of how work is being prioritized across your projects. Analyze high, medium, and low priority items.",
    icon: <Target className="h-12 w-12" />,
    color: "text-red-500",
    available: true,
    route: "/report/priority-breakdown"
  },
  {
    id: "completion-rate",
    title: "Completion Rate Report",
    description: "Track completion rates over time periods. View completed vs total issues with trend analysis.",
    icon: <TrendingUp className="h-12 w-12" />,
    color: "text-green-500",
    available: true,
    route: "/report/completion-rate"
  },
  {
    id: "time-tracking",
    title: "Time Tracking Report",
    description: "Analyze time spent on issues, projects, and by team members. Understand resource allocation and productivity.",
    icon: <Calendar className="h-12 w-12" />,
    color: "text-indigo-500",
    available: true,
    route: "/report/time-tracking"
  },
];

export const ReportClient = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReports = reportTypes.filter(report =>
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Reports</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a report to get insights into your projects
              </p>
            </div>
            <FileBarChart className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search/Filter Bar */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <Card 
              key={report.id} 
              className="group hover:shadow-lg transition-all duration-200 cursor-pointer bg-card border overflow-hidden relative"
            >
              {!report.available && (
                <div className="absolute top-3 right-3 z-10">
                  <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-2 py-1 rounded-md border border-yellow-500/20">
                    Coming Soon
                  </span>
                </div>
              )}
              
              <Link href={report.route || "#"}>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className={`${report.color} transition-transform group-hover:scale-110`}>
                      {report.icon}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
                    {report.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {report.description}
                  </p>
                  <div className="flex items-center text-sm text-primary font-medium">
                    View report
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <FileBarChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No reports found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};
