"use client";

import { useState } from "react";
import { format, parseISO, getISOWeek, getISOWeekYear, startOfISOWeek, endOfISOWeek } from "date-fns";
import { Download, Filter, FileText, Calendar, Eye, ArrowLeft, Users, ChevronDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useGetWeeklyReports } from "../api/use-get-weekly-reports";
import { useGetDepartments } from "@/features/profiles/api/use-get-departments";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminWeeklyReports() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"employees" | "weeks">("employees");
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [showUploadedFiles, setShowUploadedFiles] = useState(true);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  
  const { data: reports, isLoading } = useGetWeeklyReports({
    department: selectedDepartment || undefined,
    userId: selectedEmployee || undefined,
  });
  const { data: customDepartments, isLoading: isLoadingDepartments } = useGetDepartments();

  // Get unique employees from reports for the selected department
  const employees = selectedDepartment && reports 
    ? Array.from(new Map(reports.map((r) => [r.userId, { id: r.userId, name: r.employeeName, email: r.employeeEmail }])).values())
    : [];

  // Group reports by calendar week (ISO week number)
  const weeklyGroups = selectedDepartment && reports
    ? Array.from(
        reports.reduce((acc, report) => {
          const reportDate = parseISO(report.fromDate.toString());
          const weekNumber = getISOWeek(reportDate);
          const year = getISOWeekYear(reportDate);
          const weekKey = `${year}-W${weekNumber}`;
          
          if (!acc.has(weekKey)) {
            // Calculate the actual start and end of the ISO week
            const weekStart = startOfISOWeek(reportDate);
            const weekEnd = endOfISOWeek(reportDate);
            
            acc.set(weekKey, {
              weekKey,
              weekNumber,
              year,
              fromDate: weekStart,
              toDate: weekEnd,
              reports: [],
            });
          }
          acc.get(weekKey)!.reports.push(report);
          return acc;
        }, new Map())
      ).map(([_, group]) => group)
        .sort((a, b) => b.year - a.year || b.weekNumber - a.weekNumber)
    : [];

  const filteredReports = selectedEmployee 
    ? reports?.filter((r) => r.userId === selectedEmployee)
    : selectedWeek
    ? reports?.filter((r) => {
        const reportDate = parseISO(r.fromDate.toString());
        const weekNumber = getISOWeek(reportDate);
        const year = getISOWeekYear(reportDate);
        const reportWeekKey = `${year}-W${weekNumber}`;
        return reportWeekKey === selectedWeek;
      })
    : [];

  const handleBackToDepartments = () => {
    setSelectedDepartment("");
    setSelectedEmployee(null);
    setViewMode("employees");
    setSelectedWeek(null);
    setSelectedReportIds(new Set());
  };

  const handleBackToEmployees = () => {
    setSelectedEmployee(null);
    setSelectedReportIds(new Set());
  };

  const handleBackToSelection = () => {
    setViewMode("employees");
    setSelectedWeek(null);
    setSelectedReportIds(new Set());
  };

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setSelectedReportIds(new Set());
  };

  const handleSelectWeek = (weekKey: string) => {
    setSelectedWeek(weekKey);
    setViewMode("weeks");
    setSelectedReportIds(new Set());
  };

  const generatePDF = (report: any): jsPDF => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Weekly Report', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), 'MMMM dd, yyyy'), pageWidth / 2, 30, { align: 'center' });
    
    // Employee Information Section
    doc.setTextColor(0, 0, 0);
    let yPos = 55;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Information', 14, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const info = [
      ['Name:', report.employeeName],
      ['Email:', report.employeeEmail],
      ['Department:', report.department],
      ['Period:', `${format(parseISO(report.fromDate.toString()), 'MMM dd, yyyy')} - ${format(parseISO(report.toDate.toString()), 'MMM dd, yyyy')}`],
      ['Status:', report.status.toUpperCase()],
      ['Submitted:', format(parseISO(report.createdAt.toString()), 'MMM dd, yyyy HH:mm')],
    ];
    
    info.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 50, yPos);
      yPos += 7;
    });
    
    // Daily Descriptions Section
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Work Descriptions', 14, yPos);
    yPos += 8;
    
    const dailyData: string[][] = [];
    if (report.dailyDescriptions && Object.keys(report.dailyDescriptions).length > 0) {
      const sortedDates = Object.keys(report.dailyDescriptions).sort();
      
      sortedDates.forEach((date) => {
        const description = report.dailyDescriptions[date] || 'No description provided';
        dailyData.push([
          format(parseISO(date), 'EEE, MMM dd'),
          description
        ]);
      });
    }
    
    if (dailyData.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Description']],
        body: dailyData,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
        },
        bodyStyles: {
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'bold' },
          1: { cellWidth: 'auto' },
        },
        margin: { left: 14, right: 14 },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(128, 128, 128);
      doc.text('No daily descriptions provided', 14, yPos);
      yPos += 10;
    }
    
    // Files Section
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }
    
    console.log('[PDF Generation] Checking uploadedFiles...');
    console.log('[PDF Generation] report.uploadedFiles:', report.uploadedFiles);
    console.log('[PDF Generation] Type:', typeof report.uploadedFiles);
    console.log('[PDF Generation] Is Array:', Array.isArray(report.uploadedFiles));
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Uploaded Files', 14, yPos);
    yPos += 8;
    
    if (report.uploadedFiles && report.uploadedFiles.length > 0) {
      console.log('[PDF Generation] Found files:', report.uploadedFiles.length);
      const fileData = report.uploadedFiles.map((file: any, index: number) => {
        console.log('[PDF Generation] File', index, ':', file);
        return [
          (index + 1).toString(),
          file.fileName || file.name || 'Unknown',
          file.date ? format(parseISO(file.date), 'MMM dd, yyyy') : 'N/A',
          file.fileSize ? `${(file.fileSize / 1024).toFixed(2)} KB` : file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'N/A',
        ];
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [['#', 'File Name', 'Date', 'Size']],
        body: fileData,
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
        },
        bodyStyles: {
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 90, textColor: [59, 130, 246] }, // Blue color for clickable file names
          2: { cellWidth: 35 },
          3: { cellWidth: 25, halign: 'right' },
        },
        margin: { left: 14, right: 14 },
        didDrawCell: (data: any) => {
          // Make file names clickable (column index 1)
          if (data.section === 'body' && data.column.index === 1) {
            const fileIndex = data.row.index;
            const file = report.uploadedFiles[fileIndex];
            if (file && file.fileUrl) {
              // Add clickable link area over the cell
              doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
                url: file.fileUrl
              });
            }
          }
        }
      });
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(128, 128, 128);
      doc.text('No files uploaded', 14, yPos);
    }
    
    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        'Generated by PMS - Project Management System',
        pageWidth - 14,
        pageHeight - 10,
        { align: 'right' }
      );
    }
    
    return doc;
  };
  
  const toggleReportSelection = (reportId: string) => {
    setSelectedReportIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };
  
  const toggleAllReports = () => {
    if (!filteredReports) return;
    
    if (selectedReportIds.size === filteredReports.length) {
      setSelectedReportIds(new Set());
    } else {
      setSelectedReportIds(new Set(filteredReports.map((r) => r.id)));
    }
  };
  
  const handleViewReport = (report: any) => {
    console.log('[Admin View] Full report data:', report);
    console.log('[Admin View] uploadedFiles:', report.uploadedFiles);
    console.log('[Admin View] uploadedFiles type:', typeof report.uploadedFiles);
    console.log('[Admin View] uploadedFiles length:', report.uploadedFiles?.length);
    
    setSelectedReport(report);
    
    const doc = generatePDF(report);
    const pdfUrl = doc.output('dataurlstring');
    setPdfDataUrl(pdfUrl);
    setShowDownloadDialog(true);
  };
  
  const handleDownloadPDF = () => {
    if (!selectedReport) return;
    
    const doc = generatePDF(selectedReport);
    const fileName = `weekly-report-${selectedReport.employeeName.replace(/\s+/g, '-')}-${format(parseISO(selectedReport.fromDate.toString()), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
    
    setShowDownloadDialog(false);
    setSelectedReport(null);
    setPdfDataUrl(null);
  };
  
  const handleDownloadSelected = () => {
    if (!filteredReports || selectedReportIds.size === 0) return;
    
    const selectedReports = filteredReports.filter((r) => selectedReportIds.has(r.id));
    
    selectedReports.forEach((report) => {
      const doc = generatePDF(report);
      const fileName = `weekly-report-${(report.employeeName || 'employee').replace(/\s+/g, '-')}-${format(parseISO(report.fromDate.toString()), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
    });
  };
  
  const handleCloseDialog = () => {
    setShowDownloadDialog(false);
    setSelectedReport(null);
    setPdfDataUrl(null);
    setShowUploadedFiles(false);
  };
  
  const handleDownloadAllCSV = () => {
    if (!filteredReports || filteredReports.length === 0) return;

    const headers = [
      "Employee Name",
      "Email",
      "Department",
      "From Date",
      "To Date",
      "Status",
      "Submitted At",
    ];

    const rows = filteredReports.map((report) => [
      report.employeeName || "N/A",
      report.employeeEmail || "N/A",
      report.department,
      format(parseISO(report.fromDate.toString()), "yyyy-MM-dd"),
      format(parseISO(report.toDate.toString()), "yyyy-MM-dd"),
      report.status,
      format(parseISO(report.createdAt.toString()), "yyyy-MM-dd HH:mm"),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `weekly-reports-summary-${selectedDepartment}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Report Download
          </CardTitle>
          <CardDescription>
            Select department, then employee to view their weekly reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Department Selection */}
          {!selectedDepartment && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Select Department:</span>
              </div>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment} disabled={isLoadingDepartments}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingDepartments ? "Loading departments..." : "Choose a department"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  {customDepartments && customDepartments.length > 0 && customDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Step 2: Employee List or Weekly Reports Selection */}
          {selectedDepartment && !selectedEmployee && viewMode === "employees" && !selectedWeek && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBackToDepartments}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Departments
                  </Button>
                  <Badge variant="outline" className="ml-2">
                    {selectedDepartment}
                  </Badge>
                </div>
              </div>

              {/* View Mode Tabs */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={(viewMode as string) === "employees" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("employees")}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  By Employee
                </Button>
                <Button
                  variant={(viewMode as string) === "weeks" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("weeks")}
                  className="flex-1"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  By Week
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : employees.length > 0 ? (
                <div className="grid gap-3">
                  {employees.map((employee) => {
                    const employeeReports = reports?.filter((r) => r.userId === employee.id) || [];
                    return (
                      <Card 
                        key={employee.id} 
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleSelectEmployee(employee.id)}
                      >
                        <CardContent className="p-2 sm:p-3 md:p-4">
                          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 overflow-hidden">
                            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1 overflow-hidden">
                              <Avatar className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 text-xs">
                                <AvatarFallback className="text-xs">
                                  {employee.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="font-medium text-xs sm:text-sm md:text-base truncate">{employee.name}</div>
                                <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">{employee.email}</div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="px-1.5 sm:px-2 text-xs flex-shrink-0">
                              {employeeReports.length}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No employees found</h3>
                  <p className="text-muted-foreground">
                    No employees have submitted reports for {selectedDepartment} department
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2 Alternative: Weekly Reports List */}
          {selectedDepartment && viewMode === "weeks" && !selectedWeek && !selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBackToDepartments}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Departments
                  </Button>
                  <Badge variant="outline" className="ml-2">
                    {selectedDepartment}
                  </Badge>
                </div>
              </div>

              {/* View Mode Tabs */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={(viewMode as string) === "employees" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("employees")}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  By Employee
                </Button>
                <Button
                  variant={(viewMode as string) === "weeks" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("weeks")}
                  className="flex-1"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  By Week
                </Button>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : weeklyGroups.length > 0 ? (
                <div className="grid gap-3">
                  {weeklyGroups.map((week, index) => (
                    <Card 
                      key={week.weekKey} 
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleSelectWeek(week.weekKey)}
                    >
                      <CardContent className="p-2 sm:p-3 md:p-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 overflow-hidden">
                          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex-shrink-0">
                              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="font-medium text-xs sm:text-sm md:text-base truncate">
                                W{week.weekNumber} - {selectedDepartment.slice(0, 3)}
                              </div>
                              <div className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">
                                {format(week.fromDate, 'MMM dd')} - {format(week.toDate, 'MMM dd')}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="px-1.5 sm:px-2 text-xs flex-shrink-0">
                            {week.reports.length}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No weekly reports found</h3>
                  <p className="text-muted-foreground">
                    No weekly reports have been submitted for {selectedDepartment} department
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Reports Table - Per Employee */}
          {selectedDepartment && selectedEmployee && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
                  <Button variant="ghost" size="sm" onClick={handleBackToEmployees} className="flex-shrink-0 px-2 sm:px-3">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden xs:inline ml-2">Back</span>
                  </Button>
                  <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                    <Badge variant="outline" className="flex-shrink-0 text-xs px-1.5 sm:px-2">{selectedDepartment.slice(0, 2)}</Badge>
                    <span className="text-muted-foreground flex-shrink-0 text-xs">/</span>
                    <Badge variant="secondary" className="truncate text-xs px-1.5 sm:px-2 max-w-[80px] sm:max-w-[150px] md:max-w-[200px]">
                      {employees.find((e) => e.id === selectedEmployee)?.name}
                    </Badge>
                  </div>
                </div>
                {filteredReports && filteredReports.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
                    {selectedReportIds.size > 0 && (
                      <Button variant="primary" size="sm" onClick={handleDownloadSelected} className="text-xs px-2 sm:px-3 w-full sm:w-auto flex items-center justify-center gap-1">
                        <Download className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="hidden sm:inline">Download Selected </span>
                        <span>({selectedReportIds.size})</span>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleDownloadAllCSV} className="text-xs px-2 sm:px-3 w-full sm:w-auto flex items-center justify-center gap-1">
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="hidden sm:inline">Export Summary (CSV)</span>
                      <span className="sm:hidden">Export CSV</span>
                    </Button>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredReports && filteredReports.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={filteredReports && filteredReports.length > 0 && selectedReportIds.size === filteredReports.length}
                            onCheckedChange={toggleAllReports}
                          />
                        </TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedReportIds.has(report.id)}
                              onCheckedChange={() => toggleReportSelection(report.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(report.fromDate.toString()), "MMM dd")} -{" "}
                              {format(parseISO(report.toDate.toString()), "MMM dd, yyyy")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                report.status === "submitted"
                                  ? "default"
                                  : report.status === "reviewed"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(parseISO(report.createdAt.toString()), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewReport(report)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No reports found</h3>
                  <p className="text-muted-foreground">
                    This employee has not submitted any weekly reports yet
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3 Alternative: Reports Table - By Week (All Employees) */}
          {selectedDepartment && selectedWeek && viewMode === "weeks" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center gap-2 overflow-hidden flex-wrap">
                  <Button variant="ghost" size="sm" onClick={handleBackToSelection} className="flex-shrink-0">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Back to Weeks</span>
                    <span className="sm:hidden">Back</span>
                  </Button>
                  <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1 overflow-hidden">
                    <Badge variant="outline" className="flex-shrink-0 text-xs">{selectedDepartment.slice(0, 3)}</Badge>
                    <span className="text-muted-foreground flex-shrink-0 text-xs">/</span>
                    <Badge variant="secondary" className="truncate text-xs max-w-[150px] sm:max-w-none">
                      {selectedWeek && (() => {
                        const weekGroup = weeklyGroups.find(w => w.weekKey === selectedWeek);
                        if (weekGroup) {
                          return `W${weekGroup.weekNumber}: ${format(weekGroup.fromDate, 'MMM dd')} - ${format(weekGroup.toDate, 'MMM dd')}`;
                        }
                        return selectedWeek;
                      })()}
                    </Badge>
                  </div>
                </div>
                {filteredReports && filteredReports.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {selectedReportIds.size > 0 && (
                      <Button variant="primary" size="sm" onClick={handleDownloadSelected} className="w-full sm:w-auto text-xs whitespace-nowrap">
                        <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Download Selected ({selectedReportIds.size})</span>
                          <span className="sm:hidden"> Download Selected  ({selectedReportIds.size})</span>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleDownloadAllCSV} className="w-full sm:w-auto text-xs whitespace-nowrap">
                      <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Export Summary (CSV)</span>
                      <span className="sm:hidden">Export CSV</span>
                    </Button>
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredReports && filteredReports.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={filteredReports && filteredReports.length > 0 && selectedReportIds.size === filteredReports.length}
                            onCheckedChange={toggleAllReports}
                          />
                        </TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedReportIds.has(report.id)}
                              onCheckedChange={() => toggleReportSelection(report.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {report.employeeName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{report.employeeName}</div>
                                <div className="text-xs text-muted-foreground">{report.employeeEmail}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(report.fromDate.toString()), "MMM dd")} -{" "}
                              {format(parseISO(report.toDate.toString()), "MMM dd, yyyy")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                report.status === "submitted"
                                  ? "default"
                                  : report.status === "reviewed"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(parseISO(report.createdAt.toString()), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewReport(report)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No reports found</h3>
                  <p className="text-muted-foreground">
                    No reports were submitted for this week
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* PDF Preview and Download Dialog */}
      <Dialog open={showDownloadDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Weekly Report Preview
            </DialogTitle>
            <DialogDescription>
              {selectedReport && (
                <span>
                  {selectedReport.employeeName} • {selectedReport.department} • 
                  {format(parseISO(selectedReport.fromDate.toString()), 'MMM dd')} - 
                  {format(parseISO(selectedReport.toDate.toString()), 'MMM dd, yyyy')}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {/* PDF Preview */}
          <div className="flex-1 overflow-auto border rounded-lg bg-muted/20 min-h-[500px]">
            {pdfDataUrl ? (
              <iframe
                src={pdfDataUrl || undefined}
                className="w-full h-full min-h-[500px]"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading preview...</p>
                </div>
              </div>
            )}
          </div>

          {/* Uploaded Files Section */}
          {selectedReport && selectedReport.uploadedFiles && selectedReport.uploadedFiles.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Uploaded Documents ({selectedReport.uploadedFiles.length})
                </h3>
                <p className="text-xs text-muted-foreground italic">Click file names to open</p>
              </div>
              <div className="border rounded-lg p-4 bg-muted/10">
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {selectedReport.uploadedFiles.map((file: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-background border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <FileText className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" title={file.fileName}>
                              {file.fileName || 'Unknown File'}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span>
                                {file.date ? format(parseISO(file.date), 'MMM dd, yyyy') : 'No date'}
                              </span>
                              <span>•</span>
                              <span>
                                {file.fileSize ? `${(file.fileSize / 1024).toFixed(2)} KB` : 'Unknown size'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (file?.fileUrl) {
                                setPreviewFile(file);
                                setShowFilePreview(true);
                              } else {
                                toast.error('File URL not available');
                              }
                            }}
                            title="View file"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (file.fileUrl) {
                                // Create a temporary link element to download the file
                                const link = document.createElement('a');
                                link.href = file.fileUrl;
                                link.download = file.fileName || 'download';
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              } else {
                                toast.error('File URL not available');
                              }
                            }}
                            title="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCloseDialog}>
              Close
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={showFilePreview} onOpenChange={setShowFilePreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              File Preview
            </DialogTitle>
            <DialogDescription>
              {previewFile && (
                <span>{previewFile.fileName} • {previewFile.fileSize ? `${(previewFile.fileSize / 1024).toFixed(2)} KB` : 'Unknown size'}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto border rounded-lg bg-muted/20 min-h-[500px]">
            {previewFile?.fileUrl ? (
              <iframe
                src={previewFile.fileUrl}
                className="w-full h-full min-h-[500px]"
                title="File Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Loading preview...</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowFilePreview(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewFile?.fileUrl) {
                  const link = document.createElement('a');
                  link.href = previewFile.fileUrl;
                  link.download = previewFile.fileName || 'download';
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  toast.error('File URL not available');
                }
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
