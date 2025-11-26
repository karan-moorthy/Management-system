"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { CalendarIcon, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCreateWeeklyReport } from '../api/use-create-weekly-report';
import type { DailyDescription } from '../types';

const formSchema = z.object({
  fromDate: z.date({
    required_error: 'From date is required',
  }),
  toDate: z.date({
    required_error: 'To date is required',
  }),
  department: z.string().min(1, 'Department is required'),
  dailyDescriptions: z.array(z.object({
    date: z.string(),
    description: z.string(),
    fileUrls: z.array(z.string()),
  })),
}).refine((data) => data.toDate >= data.fromDate, {
  message: 'To date must be after from date',
  path: ['toDate'],
});

type FormValues = z.infer<typeof formSchema>;

interface WeeklyReportFormProps {
  userDepartment?: string;
}

export function WeeklyReportForm({ userDepartment }: WeeklyReportFormProps) {
  const { mutate: createReport, isPending } = useCreateWeeklyReport();
  const [dailyDates, setDailyDates] = useState<string[]>([]);
  const [fileInputs, setFileInputs] = useState<{ [key: string]: File[] }>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      department: userDepartment || '',
      dailyDescriptions: [],
    },
  });

  const fromDate = form.watch('fromDate');
  const toDate = form.watch('toDate');

  // Generate daily date boxes when date range changes
  useEffect(() => {
    if (fromDate && toDate && toDate >= fromDate) {
      const dates = eachDayOfInterval({ start: fromDate, end: toDate });
      const dateStrings = dates.map(d => format(d, 'yyyy-MM-dd'));
      setDailyDates(dateStrings);

      // Initialize daily descriptions
      const descriptions: DailyDescription[] = dateStrings.map(date => ({
        date,
        description: '',
        fileUrls: [],
      }));
      form.setValue('dailyDescriptions', descriptions);
    } else {
      setDailyDates([]);
      form.setValue('dailyDescriptions', []);
    }
  }, [fromDate, toDate, form]);

  const handleFileChange = (date: string, files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    setFileInputs(prev => ({
      ...prev,
      [date]: [...(prev[date] || []), ...newFiles],
    }));
  };

  const removeFile = (date: string, index: number) => {
    setFileInputs(prev => ({
      ...prev,
      [date]: (prev[date] || []).filter((_, i) => i !== index),
    }));
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    // TODO: Implement actual file upload to your storage service
    // For now, return mock URLs
    return files.map(file => `https://storage.example.com/${file.name}`);
  };

  const onSubmit = async (data: FormValues) => {
    try {
      // Upload all files first
      const descriptionsWithUrls = await Promise.all(
        data.dailyDescriptions.map(async (desc) => {
          const files = fileInputs[desc.date] || [];
          const fileUrls = files.length > 0 ? await uploadFiles(files) : [];
          return {
            ...desc,
            fileUrls,
          };
        })
      );

      createReport({
        fromDate: format(data.fromDate, 'yyyy-MM-dd'),
        toDate: format(data.toDate, 'yyyy-MM-dd'),
        department: data.department,
        dailyDescriptions: descriptionsWithUrls,
      });

      // Reset form
      form.reset();
      setFileInputs({});
      setDailyDates([]);
    } catch (error) {
      toast.error('Failed to submit report');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Submit Weekly Report</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fromDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>From Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="toDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>To Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date('1900-01-01')
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter department"
                        disabled={!!userDepartment}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {dailyDates.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Daily Task Descriptions</h3>
                  {dailyDates.map((date, index) => (
                    <Card key={date} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">
                            {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                          </h4>
                        </div>

                        <FormField
                          control={form.control}
                          name={`dailyDescriptions.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Describe what you worked on this day..."
                                  rows={4}
                                  className="resize-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Upload Files (Optional)
                          </label>
                          <Input
                            type="file"
                            multiple
                            onChange={(e) => handleFileChange(date, e.target.files)}
                            className="cursor-pointer"
                          />
                          {fileInputs[date] && fileInputs[date].length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {fileInputs[date].map((file, fileIndex) => (
                                <div
                                  key={fileIndex}
                                  className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-md text-sm"
                                >
                                  <span className="truncate max-w-[150px]">
                                    {file.name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(date, fileIndex)}
                                    className="hover:text-destructive"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending || dailyDates.length === 0}
                className="w-full"
              >
                {isPending ? 'Submitting...' : 'Submit Weekly Report'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
