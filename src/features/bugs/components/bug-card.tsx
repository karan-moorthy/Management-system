"use client";

import { Bug, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BugStatus, BugPriority } from "../types";
import { useUpdateBug } from "../api/use-update-bug";

interface BugCardProps {
  bug: any;
  showAssignedTo?: boolean;
  showReportedBy?: boolean;
}

export const BugCard = ({ bug, showAssignedTo, showReportedBy }: BugCardProps) => {
  const { mutate: updateBug } = useUpdateBug();

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case BugPriority.CRITICAL:
        return "bg-red-500";
      case BugPriority.HIGH:
        return "bg-orange-500";
      case BugPriority.MEDIUM:
        return "bg-yellow-500";
      case BugPriority.LOW:
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case BugStatus.OPEN:
        return "destructive";
      case BugStatus.IN_PROGRESS:
        return "default";
      case BugStatus.RESOLVED:
        return "secondary";
      case BugStatus.CLOSED:
        return "outline";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case BugStatus.OPEN:
        return <AlertCircle className="h-4 w-4" />;
      case BugStatus.IN_PROGRESS:
        return <Clock className="h-4 w-4" />;
      case BugStatus.RESOLVED:
      case BugStatus.CLOSED:
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Bug className="h-4 w-4" />;
    }
  };

  const handleStatusChange = (newStatus: string) => {
    updateBug({
      param: { bugId: bug.bugId },
      json: { bugId: bug.bugId, status: newStatus },
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-mono text-sm font-medium">{bug.bugId}</span>
              <Badge variant="outline" className="text-xs">
                {bug.bugType}
              </Badge>
            </div>
            <div className={cn("h-2 w-2 rounded-full flex-shrink-0", getPriorityColor(bug.priority))} />
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {bug.bugDescription}
          </p>

          {/* Status and metadata */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Select defaultValue={bug.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-[140px] text-xs">
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(bug.status)}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BugStatus.OPEN}>Open</SelectItem>
                  <SelectItem value={BugStatus.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={BugStatus.RESOLVED}>Resolved</SelectItem>
                  <SelectItem value={BugStatus.CLOSED}>Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(bug.createdAt), "MMM d")}
            </span>
          </div>

          {/* People info */}
          {(showAssignedTo || showReportedBy) && (
            <div className="text-xs text-muted-foreground space-y-1">
              {showAssignedTo && bug.assignedToName && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Assigned to:</span>
                  <span>{bug.assignedToName}</span>
                </div>
              )}
              {showReportedBy && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Reported by:</span>
                  <span>{bug.reportedByName}</span>
                </div>
              )}
            </div>
          )}

          {/* File attachment indicator */}
          {bug.fileUrl && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <span>📎</span>
              <span>File attached</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
