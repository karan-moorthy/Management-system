"use client";

import { useState, useMemo } from "react";
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
}

export function EmployeeWeeklyReportForm({ userDepartment }: { userDepartment?: string }) {
  const [dailyEntries, setDailyEntries] = useState<Record<string, DailyEntry>>({});
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState(userDepartment || "");
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const { mutate: submitReport, isPending } = useSubmitWeeklyReport();
  const { mutate: saveDraft, isPending: isSavingDraft } = useSaveDraft();
  const { mutate: updateDraft, isPending: isUpdatingDraft } = useUpdateDraft();
  const { refetch: refetchMyReports } = useGetMyReports();
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

  // Initialize daily entries when days change
  useMemo(() => {
    if (days.length > 0) {
      const newEntries: Record<string, DailyEntry> = {};
      days.forEach((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        if (!dailyEntries[dateStr]) {
          newEntries[dateStr] = {
            date: dateStr,
            description: "",
            files: [],
          };
        } else {
          newEntries[dateStr] = dailyEntries[dateStr];
        }
      });
      setDailyEntries(newEntries);
    }
  }, [days]);

  const updateDescription = (date: string, description: string) => {
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

  const onSubmit = async (data: WeeklyReportFormData) => {
    if (days.length === 0) {
      return;
    }

    // Build daily descriptions object
    const dailyDescriptions: Record<string, string> = {};
    Object.keys(dailyEntries).forEach((date) => {
      dailyDescriptions[date] = dailyEntries[date].description || "";
    });

    // For now, we'll simulate file uploads
    // In a real app, you'd upload files to storage first and get URLs
    const uploadedFiles: Array<{
      date: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      uploadedAt: string;
    }> = [];

    Object.keys(dailyEntries).forEach((date) => {
      dailyEntries[date].files.forEach((file) => {
        uploadedFiles.push({
          date,
          fileName: file.name,
          fileUrl: `/uploads/${file.name}`, // Simulated URL
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        });
      });
    });

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
          toast.success("Weekly report submitted successfully!");
          reset();
          setDailyEntries({});
          setDateRange(null);
          setCurrentDraftId(null);
          refetchMyReports();
        },
      }
    );
  };

  const saveDailyDraft = (date: string) => {
    const data = {
      fromDate: watch("fromDate"),
      toDate: watch("toDate"),
      department: watch("department") || selectedDepartment,
    };

    if (!data.fromDate || !data.toDate || !data.department) {
      toast.error("Please fill in the date range and department first");
      return;
    }

    const dailyDescriptions: Record<string, string> = {};
    const uploadedFiles: any[] = [];

    Object.entries(dailyEntries).forEach(([entryDate, entry]) => {
      dailyDescriptions[entryDate] = entry.description;

      entry.files.forEach((file) => {
        uploadedFiles.push({
          date: entryDate,
          fileName: file.name,
          fileUrl: `/uploads/${file.name}`,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        });
      });
    });

    const draftData = {
      fromDate: data.fromDate,
      toDate: data.toDate,
      department: data.department,
      dailyDescriptions,
      uploadedFiles,
      isDraft: true,
    };

    if (currentDraftId) {
      // Update existing draft
      updateDraft(
        {
          param: { id: currentDraftId },
          json: draftData,
        },
        {
          onSuccess: () => {
            toast.success(`Draft saved for ${format(parseISO(date), "MMM dd")}`);
            refetchMyReports();
          },
        }
      );
    } else {
      // Create new draft
      saveDraft(
        {
          json: draftData,
        },
        {
          onSuccess: (response) => {
            if (response.data) {
              setCurrentDraftId(response.data.id);
            }
            toast.success(`Draft saved for ${format(parseISO(date), "MMM dd")}`);
            refetchMyReports();
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
              {userDepartment ? (
                <Input
                  id="department"
                  value={userDepartment}
                  readOnly
                  className="bg-muted"
                />
              ) : (
                <Select
                  value={selectedDepartment}
                  onValueChange={(value) => {
                    setSelectedDepartment(value);
                    setValue("department", value, { shouldValidate: true });
                  }}
                  disabled={isLoadingDepartments}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingDepartments ? "Loading..." : "Select department"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    {customDepartments && customDepartments.length > 0 && customDepartments.map((department) => (
                      <SelectItem key={department.id} value={department.name}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

                          {/* File List */}
                          {entry?.files && entry.files.length > 0 && (
                            <div className="space-y-1">
                              {entry.files.map((file, fileIndex) => (
                                <div
                                  key={fileIndex}
                                  className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileIcon className="h-4 w-4" />
                                    <span className="truncate max-w-[300px]">{file.name}</span>
                                    <span className="text-muted-foreground">
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
