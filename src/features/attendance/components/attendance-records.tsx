"use client";

import { useState, useMemo } from "react";
import { Download, Loader2, Clock, CheckCircle2, Filter, FileText, CalendarIcon, CalendarRangeIcon, ShieldAlert, Eye, X } from "lucide-react";
import ExcelJS from 'exceljs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetAttendanceRecords } from "../api/use-attendance";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetAllEmployees } from "@/features/members/api/use-get-all-employees";

interface AttendanceRecordsProps {
  workspaceId?: string;
}

// Helper function to get week bounds (Monday to Sunday)
const getWeekBounds = (weekString: string) => {
  const [year, week] = weekString.split('-W').map(Number);
  
  // Get January 1st of the year
  const jan1 = new Date(year, 0, 1);
  const jan1Day = jan1.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Find the first Monday of the year
  const daysToMonday = jan1Day === 0 ? 1 : jan1Day === 1 ? 0 : 8 - jan1Day;
  const firstMonday = new Date(year, 0, 1 + daysToMonday);
  
  // Calculate the start of the requested week (Monday)
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
  weekStart.setHours(0, 0, 0, 0);
  
  // Calculate the end of the week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { start: weekStart, end: weekEnd };
};

// Helper function to get month bounds
const getMonthBounds = (monthString: string) => {
  const [year, month] = monthString.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
};

export const AttendanceRecords = ({ workspaceId }: AttendanceRecordsProps = {}) => {
  const { data: records, isLoading, error } = useGetAttendanceRecords();
  const { data: projects } = useGetProjects({});
  const { data: allEmployees, isLoading: isLoadingEmployees, error: employeesError } = useGetAllEmployees();
  
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>("all");
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Admin check: if useGetAllEmployees fails, user is not admin
  const isAdmin = !employeesError && allEmployees !== undefined;

  // Debug logging
  console.log('AttendanceRecords Debug:', { 
    recordsCount: records?.length, 
    isLoading, 
    hasError: !!error,
    records: records?.slice(0, 2), // Log first 2 records
    allEmployeesCount: allEmployees?.length,
    isAdmin,
    employeesError
  });

  // Get record count per employee
  const employeeRecordCounts = useMemo(() => {
    if (!records) return new Map();
    const counts = new Map<string, number>();
    records.forEach((record: any) => {
      counts.set(record.userId, (counts.get(record.userId) || 0) + 1);
    });
    return counts;
  }, [records]);

  // Filter records by selected employee, week, and month
  const filteredRecords = useMemo(() => {
    if (!records) return [];
    
    let filtered = records;
    
    // Filter by employee
    if (selectedEmployeeFilter !== "all") {
      filtered = filtered.filter((record: any) => record.userId === selectedEmployeeFilter);
    }
    
    // Filter by week
    if (selectedWeek) {
      const { start, end } = getWeekBounds(selectedWeek);
      filtered = filtered.filter((record: any) => {
        const recordDate = new Date(record.shiftStartTime);
        return recordDate >= start && recordDate <= end;
      });
    }
    
    // Filter by month
    if (selectedMonth) {
      const { start, end } = getMonthBounds(selectedMonth);
      filtered = filtered.filter((record: any) => {
        const recordDate = new Date(record.shiftStartTime);
        return recordDate >= start && recordDate <= end;
      });
    }
    
    return filtered;
  }, [records, selectedEmployeeFilter, selectedWeek, selectedMonth]);

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

  const handleViewDetails = (record: any) => {
    setSelectedRecord(record);
    setIsDetailDialogOpen(true);
  };

  const downloadCSV = async (filteredOnly = false) => {
    const dataToDownload = filteredOnly ? filteredRecords : records;
    if (!dataToDownload || dataToDownload.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Records');

    // Define columns with proper widths
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Employee Name', key: 'employeeName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
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
      fgColor: { argb: 'FF4472C4' } // Blue background
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // Add data rows
    dataToDownload.forEach((record: any) => {
      worksheet.addRow({
        date: formatDate(record.shiftStartTime),
        employeeName: record.userName || "N/A",
        email: record.userEmail || "N/A",
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
    const filename = filteredOnly && selectedEmployeeFilter !== "all"
      ? `attendance-${allEmployees?.find(e => e.id === selectedEmployeeFilter)?.name?.replace(/\s+/g, '-')}-${new Date().toISOString().split("T")[0]}.xlsx`
      : `attendance-all-employees-${new Date().toISOString().split("T")[0]}.xlsx`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSVReport = () => {
    const dataToDownload = filteredRecords;
    if (!dataToDownload || dataToDownload.length === 0) return;

    // Determine if single employee or bulk report
    const isSingleEmployee = selectedEmployeeFilter !== "all";

    if (isSingleEmployee) {
      // Single Employee CSV Report
      const headers = ['Employee Name', 'Email', 'Date', 'Start Time', 'End Time', 'Duration'];
      const csvRows = [headers.join(',')];

      dataToDownload.forEach((record: any) => {
        csvRows.push([
          `"${record.userName || "N/A"}"`,
          `"${record.userEmail || "N/A"}"`,
          formatDate(record.shiftStartTime),
          formatTime(record.shiftStartTime),
          record.shiftEndTime ? formatTime(record.shiftEndTime) : "In Progress",
          record.totalDuration ? formatDuration(record.totalDuration) : "N/A",
        ].join(','));
      });

      // Add summary row
      const totalMinutes = dataToDownload.reduce((sum: number, r: any) => sum + (r.totalDuration || 0), 0);
      const avgMinutes = totalMinutes / dataToDownload.length;
      csvRows.push('');
      csvRows.push(`Total Records,${dataToDownload.length}`);
      csvRows.push(`Total Hours,${(totalMinutes / 60).toFixed(2)}`);
      csvRows.push(`Average Hours/Day,${(avgMinutes / 60).toFixed(2)}`);

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      const employeeName = dataToDownload[0]?.userName?.replace(/\s+/g, '-') || 'employee';
      let filename = `${employeeName}-report`;
      if (selectedWeek) filename += `-week-${selectedWeek}`;
      if (selectedMonth) filename += `-month-${selectedMonth}`;
      filename += `-${new Date().toISOString().split("T")[0]}.csv`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Bulk Report CSV
      const headers = ['Employee Name', 'Email', 'Starting Date', 'Ending Date', 'Duration', 'Total Days', 'Total Hours'];
      const csvRows = [headers.join(',')];

      // Group records by employee
      const employeeRecords = new Map<string, any[]>();
      dataToDownload.forEach((record: any) => {
        const userId = record.userId;
        if (!employeeRecords.has(userId)) {
          employeeRecords.set(userId, []);
        }
        employeeRecords.get(userId)?.push(record);
      });

      // Generate rows for each employee
      employeeRecords.forEach((records, userId) => {
        const sortedRecords = records.sort((a, b) => 
          new Date(a.shiftStartTime).getTime() - new Date(b.shiftStartTime).getTime()
        );
        
        const employeeName = sortedRecords[0]?.userName || "N/A";
        const email = sortedRecords[0]?.userEmail || "N/A";
        const startingDate = formatDate(sortedRecords[0].shiftStartTime);
        const endingDate = formatDate(sortedRecords[sortedRecords.length - 1].shiftStartTime);
        const totalMinutes = sortedRecords.reduce((sum, r) => sum + (r.totalDuration || 0), 0);
        const totalDays = sortedRecords.length;
        const totalHours = (totalMinutes / 60).toFixed(2);
        const duration = formatDuration(totalMinutes);

        csvRows.push([
          `"${employeeName}"`,
          `"${email}"`,
          startingDate,
          endingDate,
          duration,
          totalDays.toString(),
          totalHours
        ].join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      let filename = 'attendance-bulk-report';
      if (selectedWeek) filename += `-week-${selectedWeek}`;
      if (selectedMonth) filename += `-month-${selectedMonth}`;
      filename += `-${new Date().toISOString().split("T")[0]}.csv`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const downloadReport = async () => {
    if (!filteredRecords || filteredRecords.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const isSingleEmployee = selectedEmployeeFilter !== "all";

    if (isSingleEmployee) {
      // Single Employee Report
      const worksheet = workbook.addWorksheet('Employee Report');
      const employee = allEmployees?.find(e => e.id === selectedEmployeeFilter);
      const totalMinutes = filteredRecords.reduce((sum, r) => sum + (r.totalDuration || 0), 0);
      const totalHours = Math.floor(totalMinutes / 60);
      const totalMins = totalMinutes % 60;
      
      // Define columns
      worksheet.columns = [
        { header: 'Employee Name', key: 'employeeName', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Start Time', key: 'startTime', width: 12 },
        { header: 'End Time', key: 'endTime', width: 12 },
        { header: 'Duration', key: 'duration', width: 12 },
      ];

      // Style header
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' } // Green background
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;

      // Add data rows
      filteredRecords.forEach((record: any) => {
        worksheet.addRow({
          employeeName: employee?.name || 'Unknown',
          email: employee?.email || 'N/A',
          date: formatDate(record.shiftStartTime),
          startTime: formatTime(record.shiftStartTime),
          endTime: record.shiftEndTime ? formatTime(record.shiftEndTime) : 'In Progress',
          duration: record.totalDuration ? formatDuration(record.totalDuration) : 'N/A'
        });
      });

      // Add summary row
      const summaryRow = worksheet.addRow({
        employeeName: '',
        email: 'TOTAL',
        date: `${filteredRecords.length} Days`,
        startTime: '',
        endTime: '',
        duration: `${totalHours}h ${totalMins}m`
      });
      summaryRow.font = { bold: true };
      summaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFD966' } // Yellow background
      };

      // Apply borders
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          cell.alignment = { vertical: 'middle' };
        });
      });

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      let filename = `attendance-report-${employee?.name?.replace(/\s+/g, '-')}`;
      if (selectedWeek) filename += `-week-${selectedWeek}`;
      if (selectedMonth) filename += `-month-${selectedMonth}`;
      filename += `-${new Date().toISOString().split("T")[0]}.xlsx`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } else {
      // Bulk Report - All Employees
      const worksheet = workbook.addWorksheet('Bulk Report');
      const employeeData = new Map<string, any[]>();
      
      filteredRecords.forEach((record: any) => {
        if (!employeeData.has(record.userId)) {
          employeeData.set(record.userId, []);
        }
        employeeData.get(record.userId)!.push(record);
      });

      // Define columns
      worksheet.columns = [
        { header: 'Employee Name', key: 'employeeName', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Starting Date', key: 'startingDate', width: 15 },
        { header: 'Ending Date', key: 'endingDate', width: 15 },
        { header: 'Duration', key: 'duration', width: 15 },
        { header: 'Total Days', key: 'totalDays', width: 12 },
        { header: 'Total Hours', key: 'totalHours', width: 15 },
      ];

      // Style header
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE67E22' } // Orange background
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;
      
      // Add data rows
      employeeData.forEach((records, userId) => {
        const employee = allEmployees?.find(e => e.id === userId);
        const totalMinutes = records.reduce((sum, r) => sum + (r.totalDuration || 0), 0);
        const totalHours = Math.floor(totalMinutes / 60);
        const totalMins = totalMinutes % 60;
        
        const sortedRecords = records.sort((a, b) => 
          new Date(a.shiftStartTime).getTime() - new Date(b.shiftStartTime).getTime()
        );
        
        const startDate = formatDate(sortedRecords[0].shiftStartTime);
        const endDate = formatDate(sortedRecords[sortedRecords.length - 1].shiftStartTime);
        const durationStr = `${totalHours}h ${totalMins}m`;
        
        worksheet.addRow({
          employeeName: employee?.name || 'Unknown',
          email: employee?.email || 'N/A',
          startingDate: startDate,
          endingDate: endDate,
          duration: durationStr,
          totalDays: records.length,
          totalHours: `${totalHours}h ${totalMins}m`
        });
      });

      // Apply borders and alignment
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
          cell.alignment = { vertical: 'middle' };
        });
      });

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      let filename = 'attendance-bulk-report';
      if (selectedWeek) filename += `-week-${selectedWeek}`;
      if (selectedMonth) filename += `-month-${selectedMonth}`;
      filename += `-${new Date().toISOString().split("T")[0]}.xlsx`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (isLoading || isLoadingEmployees) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Admin-only access check
  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Only administrators can access all employees' attendance records and download reports.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-destructive">
            <p className="text-base font-medium">Error loading attendance records</p>
            <p className="text-sm mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5" />
                All Employees Attendance Records
              </CardTitle>
              <CardDescription>
                Company-wide attendance records for all employees (Admin Only)
              </CardDescription>
            </div>
          </div>
          
          {/* Filter and Download Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[250px]">
              <Filter className="size-4 text-muted-foreground" />
              <Select value={selectedEmployeeFilter} onValueChange={setSelectedEmployeeFilter} disabled={isLoadingEmployees}>
                <SelectTrigger className="w-full max-w-[300px]">
                  <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees ({records?.length || 0} records)</SelectItem>
                  {allEmployees?.map((employee) => {
                    const recordCount = employeeRecordCounts.get(employee.id) || 0;
                    return (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} ({recordCount} {recordCount === 1 ? 'record' : 'records'})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <CalendarRangeIcon className="size-4 text-muted-foreground" />
              <Select 
                value={selectedWeek || undefined} 
                onValueChange={(val) => {
                  setSelectedWeek(val || "");
                  setSelectedMonth(""); // Clear month when week is selected
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by week" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 8 }, (_, i) => {
                    // Calculate the start of the week (Monday) for each week going back
                    const today = new Date();
                    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
                    const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // Days since last Monday
                    
                    // Get the most recent Monday
                    const thisMonday = new Date(today);
                    thisMonday.setDate(today.getDate() - daysFromMonday - (i * 7));
                    thisMonday.setHours(0, 0, 0, 0);
                    
                    // Calculate Sunday of that week
                    const thisSunday = new Date(thisMonday);
                    thisSunday.setDate(thisMonday.getDate() + 6);
                    thisSunday.setHours(23, 59, 59, 999);
                    
                    // Format for display
                    const year = thisMonday.getFullYear();
                    const weekNum = Math.ceil(
                      ((thisMonday.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7
                    );
                    const weekStr = `${year}-W${String(weekNum).padStart(2, '0')}`;
                    
                    const startMonth = thisMonday.toLocaleDateString('en-US', { month: 'short' });
                    const endMonth = thisSunday.toLocaleDateString('en-US', { month: 'short' });
                    const startDay = thisMonday.getDate();
                    const endDay = thisSunday.getDate();
                    const displayYear = thisSunday.getFullYear();
                    
                    let displayText;
                    if (startMonth === endMonth) {
                      displayText = `${startMonth} ${startDay}-${endDay}, ${displayYear}`;
                    } else {
                      displayText = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${displayYear}`;
                    }
                    
                    return (
                      <SelectItem key={weekStr} value={weekStr}>
                        {displayText}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedWeek && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedWeek("")}
                  className="h-8 px-2"
                >
                  Clear
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-muted-foreground" />
              <Select 
                value={selectedMonth || undefined} 
                onValueChange={(val) => {
                  setSelectedMonth(val || "");
                  setSelectedWeek(""); // Clear week when month is selected
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    return (
                      <SelectItem key={monthStr} value={monthStr}>
                        {monthName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedMonth && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMonth("")}
                  className="h-8 px-2"
                >
                  Clear
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => downloadCSV(false)} 
                disabled={!records || records.length === 0} 
                className="gap-2"
                variant="outline"
              >
                <Download className="size-4" />
                Download All
              </Button>
              
              <Button 
                onClick={() => setReportModalOpen(true)} 
                disabled={!filteredRecords || filteredRecords.length === 0} 
                className="gap-2"
                variant="default"
              >
                <Eye className="size-4" />
                View Report ({filteredRecords.length})
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!filteredRecords || filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="size-10 mb-3" />
            <p className="text-base font-medium">
              {selectedEmployeeFilter === "all" 
                ? "No completed attendance records found" 
                : "No records for selected employee"}
            </p>
            <p className="text-sm mt-1 text-center max-w-md">
              {selectedEmployeeFilter === "all"
                ? "No employees have completed shifts yet across the company."
                : "This employee has no completed shifts yet."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Daily Tasks</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record: any) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">
                    {formatDate(record.shiftStartTime)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {record.userName || "Unknown User"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {record.userEmail || "N/A"}
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
                      {record.dailyTasks ? (
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
            {/* Employee & Date Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Employee Name</p>
                <p className="font-semibold text-lg">{selectedRecord.userName}</p>
                <p className="text-sm text-muted-foreground">{selectedRecord.userEmail}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-semibold text-lg">
                  {formatDate(selectedRecord.shiftStartTime)}
                </p>
              </div>
            </div>

            {/* Project */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Project</p>
              <p className="font-semibold text-lg">
                {selectedRecord.projectId
                  ? projects?.documents?.find(p => p.id === selectedRecord.projectId)?.name || "Unknown Project"
                  : "No Project Selected"}
              </p>
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

    {/* View Report Modal */}
    <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            {selectedEmployeeFilter !== "all" ? "Employee Report Preview" : "Bulk Report Preview"}
          </DialogTitle>
          <DialogDescription>
            {selectedEmployeeFilter !== "all" 
              ? `Detailed attendance report for ${allEmployees?.find(e => e.id === selectedEmployeeFilter)?.name || 'selected employee'}`
              : `Bulk attendance report for all employees (${filteredRecords.length} records)`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          {selectedEmployeeFilter !== "all" ? (
            // Single Employee Preview
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Duration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.userName || "N/A"}</TableCell>
                        <TableCell>{record.userEmail || "N/A"}</TableCell>
                        <TableCell>{formatDate(record.shiftStartTime)}</TableCell>
                        <TableCell>{formatTime(record.shiftStartTime)}</TableCell>
                        <TableCell>{record.shiftEndTime ? formatTime(record.shiftEndTime) : "In Progress"}</TableCell>
                        <TableCell>{record.totalDuration ? formatDuration(record.totalDuration) : "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Summary Section */}
              <div className="rounded-lg border bg-yellow-50 p-4">
                <h3 className="font-semibold text-sm mb-3">Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Records</p>
                    <p className="font-bold text-lg">{filteredRecords.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Hours</p>
                    <p className="font-bold text-lg">
                      {(filteredRecords.reduce((sum: number, r: any) => sum + (r.totalDuration || 0), 0) / 60).toFixed(2)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Average Hours/Day</p>
                    <p className="font-bold text-lg">
                      {(filteredRecords.reduce((sum: number, r: any) => sum + (r.totalDuration || 0), 0) / 60 / filteredRecords.length).toFixed(2)}h
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Bulk Report Preview
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Starting Date</TableHead>
                    <TableHead>Ending Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Total Days</TableHead>
                    <TableHead>Total Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Group records by employee
                    const employeeRecords = new Map<string, any[]>();
                    filteredRecords.forEach((record: any) => {
                      const userId = record.userId;
                      if (!employeeRecords.has(userId)) {
                        employeeRecords.set(userId, []);
                      }
                      employeeRecords.get(userId)?.push(record);
                    });

                    // Generate rows for each employee
                    return Array.from(employeeRecords.entries()).map(([userId, records]) => {
                      const sortedRecords = records.sort((a, b) => 
                        new Date(a.shiftStartTime).getTime() - new Date(b.shiftStartTime).getTime()
                      );
                      
                      const employeeName = sortedRecords[0]?.userName || "N/A";
                      const email = sortedRecords[0]?.userEmail || "N/A";
                      const startingDate = formatDate(sortedRecords[0].shiftStartTime);
                      const endingDate = formatDate(sortedRecords[sortedRecords.length - 1].shiftStartTime);
                      const totalMinutes = sortedRecords.reduce((sum, r) => sum + (r.totalDuration || 0), 0);
                      const totalDays = sortedRecords.length;
                      const totalHours = (totalMinutes / 60).toFixed(2);
                      const duration = formatDuration(totalMinutes);

                      return (
                        <TableRow key={userId}>
                          <TableCell className="font-medium">{employeeName}</TableCell>
                          <TableCell>{email}</TableCell>
                          <TableCell>{startingDate}</TableCell>
                          <TableCell>{endingDate}</TableCell>
                          <TableCell>{duration}</TableCell>
                          <TableCell>{totalDays}</TableCell>
                          <TableCell>{totalHours}h</TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        
        {/* Download Options Footer */}
        <div className="border-t pt-4 flex items-center justify-between">
          <Button 
            onClick={() => {
              downloadReport();
              setReportModalOpen(false);
            }} 
            className="gap-2"
            variant="default"
          >
            <Download className="size-4" />
            Download Report
          </Button>
          <Button 
            onClick={() => setReportModalOpen(false)} 
            variant="ghost"
            className="gap-2"
          >
            <X className="size-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
