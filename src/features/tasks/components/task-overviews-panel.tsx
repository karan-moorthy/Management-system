"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Eye, Clock, CheckCircle, XCircle, AlertCircle, ShieldAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { TaskOverviewReview } from "./task-overview-review";
import { useGetTaskOverviews } from "../api/use-get-task-overviews";
import { TaskOverview, OverviewStatus } from "../types";
import { useGetCurrentUserRole } from "@/features/members/api/use-get-user-role";
import { MemberRole } from "@/features/members/types";

export function TaskOverviewsPanel() {
  const { data: memberRole } = useGetCurrentUserRole();
  const [selectedOverview, setSelectedOverview] = useState<TaskOverview | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  console.log("🔍 Task Overviews Panel - Member Role:", memberRole);
  console.log("📋 MemberRole enum values:", MemberRole);

  // Check if user is admin based on their role
  const isAdmin = memberRole?.role === MemberRole.ADMIN || 
                  memberRole?.role === MemberRole.PROJECT_MANAGER ||
                  memberRole?.role === MemberRole.MANAGEMENT;

  console.log("✅ Is Admin:", isAdmin);

  // Only fetch if user is admin
  const { data: pendingOverviews = [], isLoading: loadingPending } = useGetTaskOverviews({
    status: OverviewStatus.PENDING,
  });

  const { data: approvedOverviews = [], isLoading: loadingApproved } = useGetTaskOverviews({
    status: OverviewStatus.APPROVED,
  });

  const { data: reworkOverviews = [], isLoading: loadingRework } = useGetTaskOverviews({
    status: OverviewStatus.REWORK,
  });

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Only administrators and project managers can access the task overview review panel.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleReview = (overview: TaskOverview) => {
    setSelectedOverview(overview);
    setReviewDialogOpen(true);
  };

  const formatTimeSpent = (minutes?: number) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const renderOverviewsTable = (overviews: TaskOverview[], isLoading: boolean) => {
    if (isLoading) {
      return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
    }

    if (overviews.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No task overviews found</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task Title</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Time Spent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {overviews.map((overview) => (
            <TableRow key={overview.id}>
              <TableCell className="font-medium max-w-xs truncate">
                {overview.taskTitle}
              </TableCell>
              <TableCell>{overview.employeeName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(overview.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-3 w-3" />
                  {formatTimeSpent(overview.timeSpent)}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    overview.status === OverviewStatus.APPROVED
                      ? "default"
                      : overview.status === OverviewStatus.REWORK
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {overview.status === OverviewStatus.APPROVED && (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  )}
                  {overview.status === OverviewStatus.REWORK && (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {overview.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleReview(overview)}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Task Completion Overviews</CardTitle>
          <CardDescription>
            Review employee task completion submissions and approve or request rework
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pending ({pendingOverviews.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedOverviews.length})
              </TabsTrigger>
              <TabsTrigger value="rework">
                Rework ({reworkOverviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              {renderOverviewsTable(pendingOverviews as TaskOverview[], loadingPending)}
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              {renderOverviewsTable(approvedOverviews as TaskOverview[], loadingApproved)}
            </TabsContent>

            <TabsContent value="rework" className="mt-6">
              {renderOverviewsTable(reworkOverviews as TaskOverview[], loadingRework)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedOverview && (
        <TaskOverviewReview
          overview={selectedOverview}
          isOpen={reviewDialogOpen}
          onClose={() => {
            setReviewDialogOpen(false);
            setSelectedOverview(null);
          }}
          onSuccess={() => {
            // Refresh the lists after successful review
          }}
        />
      )}
    </>
  );
}
