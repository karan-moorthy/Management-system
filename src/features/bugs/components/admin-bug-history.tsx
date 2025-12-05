"use client";

import { useState, useMemo } from "react";
import { Bug, Download, Filter, MessageSquare, FileText, Calendar, User, AlertCircle } from "lucide-react";
import { format } from "date-fns";

import { useGetAllBugsAdmin } from "../api/use-get-all-bugs-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { BugStatus, BugPriority } from "../types";
import { BugDetailModal } from "./bug-detail-modal";
import { cn } from "@/lib/utils";

interface AdminBugHistoryProps {
  isAdmin?: boolean;
}

export const AdminBugHistory = ({ isAdmin = false }: AdminBugHistoryProps) => {
  const { data: allBugs = [], isLoading } = useGetAllBugsAdmin({ enabled: isAdmin });
  const [selectedBug, setSelectedBug] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Filter bugs based on search and filters
  const filteredBugs = useMemo(() => {
    return allBugs.filter((bug) => {
      const matchesSearch =
        bug.bugId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bug.bugDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bug.assignedToName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bug.reportedByName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || bug.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || bug.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [allBugs, searchQuery, statusFilter, priorityFilter]);

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case BugPriority.CRITICAL:
        return "text-red-600 bg-red-50 dark:bg-red-950/30";
      case BugPriority.HIGH:
        return "text-orange-600 bg-orange-50 dark:bg-orange-950/30";
      case BugPriority.MEDIUM:
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30";
      case BugPriority.LOW:
        return "text-green-600 bg-green-50 dark:bg-green-950/30";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-950/30";
    }
  };

  const getStatusColor = (status: string) => {
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

  const downloadCSV = () => {
    const headers = [
      "Bug ID",
      "Status",
      "Priority",
      "Bug Type",
      "Description",
      "Assigned To",
      "Reported By",
      "Comments",
      "Created Date",
      "Resolved Date",
    ];

    const rows = filteredBugs.map((bug) => [
      bug.bugId,
      bug.status,
      bug.priority || "N/A",
      bug.bugType,
      `"${bug.bugDescription.replace(/"/g, '""')}"`, // Escape quotes in description
      bug.assignedToName || "N/A",
      bug.reportedByName,
      bug.commentCount || 0,
      format(new Date(bug.createdAt), "yyyy-MM-dd HH:mm"),
      bug.resolvedAt ? format(new Date(bug.resolvedAt), "yyyy-MM-dd HH:mm") : "N/A",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bug-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Statistics
  const stats = useMemo(() => {
    return {
      total: allBugs.length,
      open: allBugs.filter((b) => b.status === BugStatus.OPEN).length,
      inProgress: allBugs.filter((b) => b.status === BugStatus.IN_PROGRESS).length,
      resolved: allBugs.filter((b) => b.status === BugStatus.RESOLVED).length,
      closed: allBugs.filter((b) => b.status === BugStatus.CLOSED).length,
      critical: allBugs.filter((b) => b.priority === BugPriority.CRITICAL).length,
    };
  }, [allBugs]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Bugs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="text-xl md:text-2xl font-bold text-red-600">{stats.open}</div>
            <div className="text-xs text-muted-foreground">Open</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="text-xl md:text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="text-xl md:text-2xl font-bold text-purple-600">{stats.resolved}</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="text-xl md:text-2xl font-bold text-gray-600">{stats.closed}</div>
            <div className="text-xs text-muted-foreground">Closed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="text-xl md:text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </CardContent>
        </Card>                                                           
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Bug className="h-4 w-4 md:h-5 md:w-5" />
              <span className="truncate">All Bug History ({filteredBugs.length})</span>
            </CardTitle>
            <Button onClick={downloadCSV} variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Export CSV</span>
              <span className="xs:hidden">Export</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
            <Input
              placeholder="Search bugs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sm:col-span-2"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={BugStatus.OPEN}>Open</SelectItem>
                <SelectItem value={BugStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={BugStatus.RESOLVED}>Resolved</SelectItem>
                <SelectItem value={BugStatus.CLOSED}>Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value={BugPriority.LOW}>Low</SelectItem>
                <SelectItem value={BugPriority.MEDIUM}>Medium</SelectItem>
                <SelectItem value={BugPriority.HIGH}>High</SelectItem>
                <SelectItem value={BugPriority.CRITICAL}>Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile Card View - Hidden on large screens */}
          <div className="lg:hidden space-y-4">
            {filteredBugs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No bugs found
              </div>
            ) : (
              filteredBugs.map((bug) => (
                <Card key={bug.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedBug(bug)}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-mono text-sm font-bold">{bug.bugId}</div>
                        <Badge variant="outline" className="text-xs">
                          {bug.bugType}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1.5 items-end">
                        <Badge variant={getStatusColor(bug.status)} className="text-xs">
                          {bug.status}
                        </Badge>
                        <Badge className={cn("text-xs", getPriorityColor(bug.priority))}>
                          {bug.priority || "N/A"}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {bug.bugDescription}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{bug.assignedToName || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{bug.reportedByName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{bug.commentCount || 0} comments</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{format(new Date(bug.createdAt), "MMM d")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table View - Hidden on small screens */}
          <div className="hidden lg:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Bug ID</TableHead>
                  <TableHead className="min-w-[110px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Priority</TableHead>
                  <TableHead className="min-w-[120px]">Type</TableHead>
                  <TableHead className="min-w-[200px] max-w-[300px]">Description</TableHead>
                  <TableHead className="min-w-[150px]">Assigned To</TableHead>
                  <TableHead className="min-w-[150px]">Reported By</TableHead>
                  <TableHead className="text-center min-w-[100px]">Comments</TableHead>
                  <TableHead className="min-w-[120px]">Created</TableHead>
                  <TableHead className="min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBugs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No bugs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBugs.map((bug) => (
                    <TableRow key={bug.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono text-sm font-medium">
                        {bug.bugId}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(bug.status)} className="text-xs whitespace-nowrap">
                          {bug.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs whitespace-nowrap", getPriorityColor(bug.priority))}>
                          {bug.priority || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {bug.bugType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="text-sm line-clamp-2 text-muted-foreground">
                          {bug.bugDescription}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{bug.assignedToName || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{bug.reportedByName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{bug.commentCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm whitespace-nowrap">
                            {format(new Date(bug.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedBug(bug)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bug Detail Modal */}
      {selectedBug && (
        <BugDetailModal
          bug={selectedBug}
          isOpen={!!selectedBug}
          onClose={() => setSelectedBug(null)}
          isAssignee={false}
          isReporter={false}
        />
      )}
    </div>
  );
};
