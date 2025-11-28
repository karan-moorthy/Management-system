"use client";

import { useState } from "react";
import { Download, Loader2, Clock, CheckCircle2, Edit2, Save, X } from "lucide-react";
import ExcelJS from 'exceljs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetMyAttendance, useUpdateTasks } from "../api/use-attendance";
import { useGetProjects } from "@/features/projects/api/use-get-projects";

interface MyAttendanceHistoryProps {
  workspaceId?: string;
}

export const MyAttendanceHistory = ({ workspaceId }: MyAttendanceHistoryProps = {}) => {
  const { data: records, isLoading } = useGetMyAttendance();
  const { data: projects } = useGetProjects({});
  const updateTasks = useUpdateTasks();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTasks, setEditedTasks] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEditClick = (record: any) => {
    setEditingId(record.id);
    const tasksText = (record.dailyTasks as string[])?.join("\n") || "";
    setEditedTasks(tasksText);
  };

  const handleSaveEdit = (attendanceId: string) => {
    const tasksArray = editedTasks
      .split("\n")
      .map((task) => task.trim())
      .filter((task) => task.length > 0);

    if (tasksArray.length === 0) {
      return;
    }

    updateTasks.mutate(
      { attendanceId, dailyTasks: tasksArray },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditedTasks("");
        },
      }
    );
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedTasks("");
  };

  const handleViewDetails = (record: any) => {
    setSelectedRecord(record);
    setIsDetailDialogOpen(true);
  };

  const downloadCSV = async () => {
    if (!records || records.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('My Attendance');

    // Define columns with proper widths
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Start Time', key: 'startTime', width: 12 },
      { header: 'End Time', key: 'endTime', width: 12 },
      { header: 'Duration', key: 'duration', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'End Activity', key: 'endActivity', width: 20 },
      { header: 'Tasks', key: 'tasks', width: 50 },
    ];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9B59B6' } // Purple background
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // Add data rows
    records.forEach((record: any) => {
      worksheet.addRow({
        date: formatDate(record.shiftStartTime),
        startTime: formatTime(record.shiftStartTime),
        endTime: record.shiftEndTime ? formatTime(record.shiftEndTime) : "In Progress",
        duration: record.totalDuration ? formatDuration(record.totalDuration) : "N/A",
        status: record.status,
        endActivity: record.endActivity || "N/A",
        tasks: record.dailyTasks ? (record.dailyTasks as string[]).join(', ') : "N/A",
      });
    });

    // Apply borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        if (rowNumber > 1) {
          cell.alignment = { vertical: 'middle', wrapText: true };
        }
      });
    });

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-attendance-${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              My Attendance History
            </CardTitle>
            <CardDescription>
              View all your attendance records and edit your tasks
            </CardDescription>
          </div>
          <Button onClick={downloadCSV} disabled={!records || records.length === 0} className="gap-2">
            <Download className="size-4" />
            Download CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!records || records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="size-10 mb-3" />
            <p>No attendance records found</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Daily Tasks</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {formatDate(record.shiftStartTime)}
                    </TableCell>
                    <TableCell>{formatTime(record.shiftStartTime)}</TableCell>
                    <TableCell>
                      {record.shiftEndTime ? formatTime(record.shiftEndTime) : "-"}
                    </TableCell>
                    <TableCell>
                      {record.totalDuration ? formatDuration(record.totalDuration) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={record.status === "COMPLETED" ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {record.status === "COMPLETED" ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <Clock className="size-3" />
                        )}
                        {record.status === "COMPLETED" ? "Completed" : "In Progress"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingId === record.id ? (
                        <Textarea
                          value={editedTasks}
                          onChange={(e) => setEditedTasks(e.target.value)}
                          rows={4}
                          className="min-w-[300px]"
                        />
                      ) : record.dailyTasks ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(record)}
                          className="text-primary hover:underline"
                        >
                          View {(record.dailyTasks as string[]).length} tasks
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">No tasks yet</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === record.id ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(record.id)}
                            disabled={updateTasks.isPending}
                            className="gap-1"
                          >
                            {updateTasks.isPending ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Save className="size-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={updateTasks.isPending}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditClick(record)}
                          className="gap-1"
                        >
                          <Edit2 className="size-3" />
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Detail Dialog */}
    <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Attendance Details</DialogTitle>
          <DialogDescription>
            Complete information for this shift
          </DialogDescription>
        </DialogHeader>
        {selectedRecord && (
          <div className="space-y-4 overflow-y-auto flex-1 px-1">
            {/* Date and Project */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-semibold text-lg">
                  {formatDate(selectedRecord.shiftStartTime)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Project</p>
                <p className="font-semibold text-lg">
                  {selectedRecord.projectId
                    ? projects?.documents?.find(p => p.id === selectedRecord.projectId)?.name || "Unknown Project"
                    : "No Project Selected"}
                </p>
              </div>
            </div>

            {/* Time Details */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <h3 className="font-semibold text-sm mb-3">Time Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Start Time</p>
                  <p className="font-medium">{formatTime(selectedRecord.shiftStartTime)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End Time</p>
                  <p className="font-medium">
                    {selectedRecord.shiftEndTime ? formatTime(selectedRecord.shiftEndTime) : "In Progress"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Duration</p>
                  <p className="font-medium text-primary text-lg">
                    {selectedRecord.totalDuration ? formatDuration(selectedRecord.totalDuration) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    variant={selectedRecord.status === "COMPLETED" ? "default" : "secondary"}
                    className="gap-1"
                  >
                    {selectedRecord.status === "COMPLETED" ? (
                      <CheckCircle2 className="size-3" />
                    ) : (
                      <Clock className="size-3" />
                    )}
                    {selectedRecord.status === "COMPLETED" ? "Completed" : "In Progress"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Daily Tasks */}
            {selectedRecord.dailyTasks && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">
                  Daily Tasks ({(selectedRecord.dailyTasks as string[]).length})
                </h3>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <ul className="space-y-2">
                    {(selectedRecord.dailyTasks as string[]).map((task, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-semibold min-w-[24px]">{i + 1}.</span>
                        <span>{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};
