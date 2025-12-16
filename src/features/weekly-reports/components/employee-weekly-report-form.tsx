"use client";

import { useState, useMemo, useEffect } from "react";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { Calendar, Upload, Loader2, FileIcon, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubmitWeeklyReport } from "../api/use-submit-weekly-report";
import { useGetMyReports } from "../api/use-get-weekly-reports";
import { useGetDepartments } from "@/features/profiles/api/use-get-departments";
import { getCurrent } from "@/features/auth/queries";
import { useSaveDraft } from "../api/use-save-draft";
import { useUpdateDraft } from "../api/use-update-draft";
import { toast } from "sonner";

const weeklyReportSchema = z.object({
  fromDate: z.string().min(1, "From date is required"),
  toDate: z.string().min(1, "To date is required"),
  department: z.string().min(1, "Department is required"),
});

type WeeklyReportFormData = z.infer<typeof weeklyReportSchema>;

interface DailyEntry {
  date: string;
  description: string;
  files: File[];
  uploadedFiles?: Array<{
    date: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: string;
  }>;
}

export function EmployeeWeeklyReportForm({ userDepartment }: { userDepartment: string }) {
  const [dailyEntries, setDailyEntries] = useState<Record<string, DailyEntry>>({});
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState(userDepartment || "");
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const { mutate: submitReport, isPending } = useSubmitWeeklyReport();
  const { mutate: saveDraft, isPending: isSavingDraft } = useSaveDraft();
  const { mutate: updateDraft, isPending: isUpdatingDraft } = useUpdateDraft();
  const { data: myReports, refetch: refetchMyReports } = useGetMyReports();
  const { data: customDepartments, isLoading: isLoadingDepartments } = useGetDepartments();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<WeeklyReportFormData>({
    resolver: zodResolver(weeklyReportSchema),
    defaultValues: {
      department: userDepartment || "",
    },
  });

  const fromDate = watch("fromDate");
  const toDate = watch("toDate");

  // Sync department with user profile whenever it changes
  useEffect(() => {
    if (userDepartment) {
      setSelectedDepartment(userDepartment);
      setValue("department", userDepartment, { shouldValidate: true });
    }
  }, [userDepartment, setValue]);

  // Generate days array when date range changes
  const days = useMemo(() => {
    if (!fromDate || !toDate) return [];

    try {
      const start = parseISO(fromDate);
      const end = parseISO(toDate);

      if (start > end) return [];

      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [fromDate, toDate]);

  // Load existing draft when date range and reports are available
  useEffect(() => {
    if (fromDate && toDate && myReports && myReports.length > 0) {
      console.log('[Draft Load] Checking for existing drafts...', { fromDate, toDate, reportsCount: myReports.length });
      
      // Find a draft for this date range
      const existingDraft = myReports.find((report: any) => {
        if (report.isDraft !== 'true') return false;
        
        const reportFrom = format(parseISO(report.fromDate.toString()), "yyyy-MM-dd");
        const reportTo = format(parseISO(report.toDate.toString()), "yyyy-MM-dd");
        
        return reportFrom === fromDate && reportTo === toDate;
      });

      if (existingDraft) {
        console.log('[Draft Load] Found existing draft:', existingDraft.id);
        
        // Only load if it's a different draft or if we don't have a current draft ID
        if (currentDraftId !== existingDraft.id) {
          // Load draft data
          setCurrentDraftId(existingDraft.id);
          setSelectedDepartment(existingDraft.department);
          setValue("department", existingDraft.department);

          // Load daily descriptions and uploaded files
          const loadedEntries: Record<string, DailyEntry> = {};
          const dailyDescs = existingDraft.dailyDescriptions as Record<string, string>;
          const uploadedFilesData = existingDraft.uploadedFiles as Array<{
            date: string;
            fileName: string;
            fileUrl: string;
            fileSize: number;
            uploadedAt: string;
          }> || [];
          
          // Create a map of date to uploaded files
          const filesByDate = new Map<string, typeof uploadedFilesData>();
          uploadedFilesData.forEach((file) => {
            if (!filesByDate.has(file.date)) {
              filesByDate.set(file.date, []);
            }
            filesByDate.get(file.date)!.push(file);
          });

          // Get all unique dates from both descriptions and uploaded files
          const allDates = new Set([
            ...Object.keys(dailyDescs || {}),
            ...Array.from(filesByDate.keys())
          ]);

          allDates.forEach((date) => {
            loadedEntries[date] = {
              date,
              description: dailyDescs?.[date] || "",
              files: [], // New files to be uploaded
              uploadedFiles: filesByDate.get(date) || [], // Previously uploaded files
            };
          });

          setDailyEntries(loadedEntries);
          console.log('[Draft Load] Loaded entries:', Object.keys(loadedEntries).length);
          console.log('[Draft Load] Loaded files:', uploadedFilesData.length);
          toast.info("Existing draft loaded for this date range", { duration: 3000 });
        } else {
          console.log('[Draft Load] Draft already loaded, skipping to preserve edits');
        }
      } else {
        console.log('[Draft Load] No existing draft found for this date range');
        // Clear current draft ID if date range changed and no draft exists
        if (currentDraftId) {
          setCurrentDraftId(null);
        }
      }
    }
  }, [fromDate, toDate, myReports, setValue]);

  // Initialize daily entries when days change (but preserve existing data)
  useEffect(() => {
    if (days.length > 0) {
      setDailyEntries((prev) => {
        const newEntries: Record<string, DailyEntry> = { ...prev };
        days.forEach((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          if (!newEntries[dateStr]) {
            newEntries[dateStr] = {
              date: dateStr,
              description: "",
              files: [],
              uploadedFiles: [],
            };
          }
        });
        return newEntries;
      });
    }
  }, [days]);

  const updateDescription = (date: string, description: string) => {
    console.log('[Description Update]', date, 'length:', description.length);
    setDailyEntries((prev) => ({
      ...prev,
      [date]: { ...prev[date], description },
    }));
  };

  const addFiles = (date: string, newFiles: FileList | null) => {
    if (!newFiles) return;

    setDailyEntries((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        files: [...prev[date].files, ...Array.from(newFiles)],
      },
    }));
  };

  const removeFile = (date: string, fileIndex: number) => {
    setDailyEntries((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        files: prev[date].files.filter((_, i) => i !== fileIndex),
      },
    }));
  };

  const removeUploadedFile = (date: string, fileIndex: number) => {
    setDailyEntries((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        uploadedFiles: prev[date].uploadedFiles?.filter((_, i) => i !== fileIndex) || [],
      },
    }));
  };

  const onSubmit = async (data: WeeklyReportFormData) => {
    if (days.length === 0) {
      return;
    }

    // Build daily descriptions object
    const dailyDescriptions: Record<string, string> = {};
    Object.keys(dailyEntries).forEach((date) => {
      dailyDescriptions[date] = dailyEntries[date].description || "";
    });

    // Convert files to base64 data URLs so they can be stored
    const uploadedFiles: Array<{
      date: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      uploadedAt: string;
    }> = [];

    // Helper function to convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    // Process all files and convert to base64
    for (const [date, entry] of Object.entries(dailyEntries)) {
      // Add previously uploaded files (from loaded draft)
      if (entry.uploadedFiles && entry.uploadedFiles.length > 0) {
        entry.uploadedFiles.forEach((existingFile) => {
          uploadedFiles.push({
            date: existingFile.date,
            fileName: existingFile.fileName,
            fileUrl: existingFile.fileUrl,
            fileSize: existingFile.fileSize,
            uploadedAt: existingFile.uploadedAt,
          });
        });
      }
      
      // Convert new files to base64 and add them
      for (const file of entry.files) {
        try {
          const base64Data = await fileToBase64(file);
          uploadedFiles.push({
            date,
            fileName: file.name,
            fileUrl: base64Data, // Store as base64 data URL
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error converting file to base64:', file.name, error);
          toast.error(`Failed to process file: ${file.name}`);
        }
      }
    }

    console.log('[Employee Submit] Daily entries:', Object.keys(dailyEntries).length);
    console.log('[Employee Submit] Daily entries detail:', dailyEntries);
    console.log('[Employee Submit] Uploaded files count:', uploadedFiles.length);
    console.log('[Employee Submit] Uploaded files:', uploadedFiles);

    // If there's an existing draft, update it to submitted status
    if (currentDraftId) {
      console.log('[Employee Submit] Updating existing draft:', currentDraftId);
      updateDraft(
        {
          param: { id: currentDraftId },
          json: {
            fromDate: data.fromDate,
            toDate: data.toDate,
            department: data.department,
            dailyDescriptions,
            uploadedFiles,
            isDraft: false, // Convert draft to submitted
          },
        },
        {
          onSuccess: () => {
            toast.success("Weekly report submitted successfully! Your report is now visible to admins.", {
              duration: 5000,
            });
            reset();
            setDailyEntries({});
            setDateRange(null);
            setCurrentDraftId(null);
            refetchMyReports();
          },
          onError: () => {
            toast.error("Failed to submit weekly report. Please try again.");
          },
        }
      );
    } else {
      // No existing draft, create new submitted report
      submitReport(
        {
          json: {
            fromDate: data.fromDate,
            toDate: data.toDate,
            department: data.department,
            dailyDescriptions,
            uploadedFiles,
            isDraft: false,
          },
        },
        {
          onSuccess: () => {
            toast.success("Weekly report submitted successfully! Your report is now visible to admins.", {
              duration: 5000,
            });
            reset();
            setDailyEntries({});
            setDateRange(null);
            setCurrentDraftId(null);
            refetchMyReports();
          },
          onError: () => {
            toast.error("Failed to submit weekly report. Please try again.");
          },
        }
      );
    }
  };

  const saveDailyDraft = async (date: string) => {
    const data = {
      fromDate: watch("fromDate"),
      toDate: watch("toDate"),
      department: watch("department") || selectedDepartment,
    };

    console.log('[Draft Save] Starting draft save for date:', date);
    console.log('[Draft Save] Form data:', data);
    console.log('[Draft Save] Current draft ID:', currentDraftId);

    if (!data.fromDate || !data.toDate || !data.department) {
      toast.error("Please fill in the date range and department first");
      return;
    }

    // Helper function to convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    // Build daily descriptions object - save ALL entries
    const dailyDescriptions: Record<string, string> = {};
    const uploadedFiles: any[] = [];

    for (const [entryDate, entry] of Object.entries(dailyEntries)) {
      dailyDescriptions[entryDate] = entry.description;

      // Add previously uploaded files
      if (entry.uploadedFiles && entry.uploadedFiles.length > 0) {
        uploadedFiles.push(...entry.uploadedFiles);
      }

      // Convert new files to base64 and add them
      for (const file of entry.files) {
        try {
          const base64Data = await fileToBase64(file);
          uploadedFiles.push({
            date: entryDate,
            fileName: file.name,
            fileUrl: base64Data,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Error converting file to base64:', file.name, error);
        }
      }
    }

    console.log('[Draft Save] Daily descriptions count:', Object.keys(dailyDescriptions).length);
    console.log('[Draft Save] Uploaded files count:', uploadedFiles.length);

    const draftData = {
      fromDate: data.fromDate,
      toDate: data.toDate,
      department: data.department,
      dailyDescriptions,
      uploadedFiles,
      isDraft: true,
    };

    console.log('[Draft Save] Draft data prepared:', { ...draftData, dailyDescriptions: Object.keys(dailyDescriptions) });

    if (currentDraftId) {
      console.log('[Draft Save] Updating existing draft:', currentDraftId);
      // Update existing draft with all entries
      updateDraft(
        {
          param: { id: currentDraftId },
          json: draftData,
        },
        {
          onSuccess: () => {
            console.log('[Draft Save] Draft updated successfully');
            toast.success(`Draft saved for ${format(parseISO(date), "MMM dd")}! All daily entries saved.`, {
              duration: 3000,
            });
            refetchMyReports();
          },
          onError: (error) => {
            console.error('[Draft Save] Error updating draft:', error);
            toast.error("Failed to save draft. Please try again.");
          },
        }
      );
    } else {
      console.log('[Draft Save] Creating new draft');
      // Create new draft with all entries
      saveDraft(
        {
          json: draftData,
        },
        {
          onSuccess: (response) => {
            console.log('[Draft Save] Draft created successfully:', response);
            if (response.data) {
              setCurrentDraftId(response.data.id);
              console.log('[Draft Save] Set current draft ID to:', response.data.id);
            }
            toast.success(`Draft saved for ${format(parseISO(date), "MMM dd")}! All daily entries saved.`, {
              duration: 3000,
            });
            refetchMyReports();
          },
          onError: (error) => {
            console.error('[Draft Save] Error creating draft:', error);
            toast.error("Failed to save draft. Please try again.");
          },
        }
      );
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Submit Weekly Report
        </CardTitle>
        <CardDescription>
          Fill in your daily task descriptions for the selected date range
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Date Range and Department */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromDate">From Date *</Label>
              <Input id="fromDate" type="date" {...register("fromDate")} />
              {errors.fromDate && (
                <p className="text-sm text-red-500">{errors.fromDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="toDate">To Date *</Label>
              <Input id="toDate" type="date" {...register("toDate")} />
              {errors.toDate && (
                <p className="text-sm text-red-500">{errors.toDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <div className="relative">
                <Input
                  id="department"
                  value={userDepartment || ""}
                  placeholder="No department assigned"
                  readOnly
                  className="bg-muted/50 cursor-not-allowed border-muted-foreground/20"
                  title="Department is automatically populated from your profile"
                />
              </div>
              {!userDepartment ? (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Department Not Assigned
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      Please contact your administrator to assign a department to your profile before submitting reports.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Department is automatically populated from your profile
                </p>
              )}
              {errors.department && (
                <p className="text-sm text-red-500">{errors.department.message}</p>
              )}
            </div>
          </div>

          {/* Daily Descriptions */}
          {days.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Daily Task Descriptions ({days.length} days)
                </h3>
              </div>

              <div className="space-y-4">
                {days.map((day, index) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const entry = dailyEntries[dateStr];

                  return (
                    <Card key={dateStr} className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium">
                          {format(day, "EEEE, MMMM dd, yyyy")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Description */}
                        <div className="space-y-2">
                          <Label htmlFor={`desc-${dateStr}`}>
                            Task Description for {format(day, "MMM dd")}
                          </Label>
                          <Textarea
                            id={`desc-${dateStr}`}
                            placeholder="Describe your tasks and accomplishments for this day..."
                            value={entry?.description || ""}
                            onChange={(e) => updateDescription(dateStr, e.target.value)}
                            rows={4}
                            className="resize-none"
                          />
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                          <Label>Attachments (Optional)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              multiple
                              id={`files-${dateStr}`}
                              onChange={(e) => addFiles(dateStr, e.target.files)}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                document.getElementById(`files-${dateStr}`)?.click()
                              }
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Files
                            </Button>
                          </div>

                          {/* File List - New Files */}
                          {entry?.files && entry.files.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">New Files to Upload:</p>
                              {entry.files.map((file, fileIndex) => (
                                <div
                                  key={fileIndex}
                                  className="flex items-center justify-between gap-2 p-2 bg-muted rounded-md text-sm"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                    <FileIcon className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate flex-1 min-w-0 text-xs sm:text-sm">{file.name}</span>
                                    <span className="text-muted-foreground text-xs flex-shrink-0">
                                      ({(file.size / 1024).toFixed(1)} KB)
                                    </span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(dateStr, fileIndex)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Previously Uploaded Files */}
                          {entry?.uploadedFiles && entry.uploadedFiles.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">Previously Uploaded Files:</p>
                              {entry.uploadedFiles.map((file, fileIndex) => (
                                <div
                                  key={fileIndex}
                                  className="flex items-center justify-between gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md text-sm border border-blue-200 dark:border-blue-800"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                    <FileIcon className="h-4 w-4 flex-shrink-0 text-blue-600" />
                                    <span className="truncate flex-1 min-w-0 text-xs sm:text-sm">{file.fileName}</span>
                                    <span className="text-muted-foreground text-xs flex-shrink-0">
                                      ({(file.fileSize / 1024).toFixed(1)} KB)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="secondary" className="text-xs flex-shrink-0">Saved</Badge>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeUploadedFile(dateStr, fileIndex)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <X className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Save Draft Button */}
                        <div className="flex justify-end pt-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => saveDailyDraft(dateStr)}
                            disabled={isSavingDraft || isUpdatingDraft}
                          >
                            {isSavingDraft || isUpdatingDraft ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Draft"
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" disabled={isPending || days.length === 0}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Weekly Report"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
