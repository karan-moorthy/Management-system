"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { usePermissionContext } from "@/components/providers/permission-provider";
import { MemberRole } from "@/features/members/types";
import { useCurrent } from "@/features/auth/api/use-current";

import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/date-picker";
import { DottedSeparator } from "@/components/dotted-separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createTaskSchema } from "../schemas";
import { useCreateTask } from "../api/use-create-task";
import { TaskStatus, TaskPriority, IssueType } from "../types";
import { useGetListViewColumns, ListViewColumn } from "../api/use-list-view-columns";

interface CreateTaskFormProps {
  onCancel?: () => void;
  projectOptions: { id: string; name: string; imageUrl: string }[];
  memberOptions: { id: string; name: string }[];
}

export const CreateTaskForm = ({
  onCancel,
  projectOptions,
  memberOptions,
}: CreateTaskFormProps) => {
  const workspaceId = useWorkspaceId();
  const { mutate, isPending } = useCreateTask();
  const { role } = usePermissionContext();
  const { data: currentUser } = useCurrent();
  
  const isEmployee = role === MemberRole.EMPLOYEE;
  const isAdmin = role === MemberRole.ADMIN || role === MemberRole.PROJECT_MANAGER;

  const form = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema.omit({ workspaceId: true })),
    defaultValues: {
      workspaceId,
      assigneeId: isEmployee ? currentUser?.id : undefined,
      projectName: undefined,
      projectId: undefined,
      customFields: {},
    },
  });

  // Watch selected project to fetch its columns
  const selectedProjectId = form.watch('projectId');
  const { data: columns, isLoading: columnsLoading } = useGetListViewColumns(selectedProjectId || '');

  // Store custom field values
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});

  // Update customFields in form when custom field values change
  useEffect(() => {
    form.setValue('customFields', customFieldValues);
  }, [customFieldValues, form]);

  const onSubmit = (values: z.infer<typeof createTaskSchema>) => {
    const payload = { 
      ...values, 
      workspaceId: isEmployee ? undefined : workspaceId, // Individual tasks have no workspace
      assigneeId: isEmployee ? currentUser?.id : values.assigneeId,
      projectName: isEmployee ? undefined : values.projectName,
      projectId: isEmployee ? undefined : values.projectId,
      customFields: customFieldValues,
    };
    mutate(
      { json: payload },
      {
        onSuccess: () => {
          form.reset();
          setCustomFieldValues({});
          onCancel?.();
        },
      }
    );
  };

  // Helper function to check if a field is a standard task field
  const isStandardField = (fieldName: string) => {
    const standardFields = [
      'summary', 'issueId', 'projectName', 'projectId', 'description', 
      'dueDate', 'assigneeId', 'assignee', 'reporterId', 'reporter', 
      'creatorId', 'creator', 'status', 'priority', 'issueType', 
      'resolution', 'estimatedHours', 'actualHours', 'labels', 'parentTaskId'
    ];
    return standardFields.includes(fieldName);
  };

  // Render dynamic form field based on column type
  const renderDynamicField = (column: ListViewColumn) => {
    // Skip system-generated fields
    if (column.fieldName === 'issueId' || column.fieldName === 'createdAt' || column.fieldName === 'updatedAt') {
      return null;
    }

    // Skip if this is a standard field that we already render
    if (isStandardField(column.fieldName)) {
      return null;
    }

    const handleCustomFieldChange = (value: any) => {
      setCustomFieldValues(prev => ({
        ...prev,
        [column.fieldName]: value
      }));
    };

    switch (column.columnType) {
      case 'text':
        return (
          <FormItem key={column.id}>
            <FormLabel>{column.displayName}</FormLabel>
            <FormControl>
              <Input
                placeholder={`Enter ${column.displayName.toLowerCase()}`}
                value={customFieldValues[column.fieldName] || ''}
                onChange={(e) => handleCustomFieldChange(e.target.value)}
              />
            </FormControl>
          </FormItem>
        );

      case 'user':
        return (
          <FormItem key={column.id}>
            <FormLabel>{column.displayName}</FormLabel>
            <Select
              value={customFieldValues[column.fieldName] || ''}
              onValueChange={handleCustomFieldChange}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${column.displayName.toLowerCase()}`} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {memberOptions.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-x-2">
                      <MemberAvatar className="size-6" name={member.name} />
                      {member.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        );

      case 'date':
        return (
          <FormItem key={column.id}>
            <FormLabel>{column.displayName}</FormLabel>
            <FormControl>
              <DatePicker
                value={customFieldValues[column.fieldName] ? new Date(customFieldValues[column.fieldName]) : undefined}
                onChange={(date) => handleCustomFieldChange(date?.toISOString())}
              />
            </FormControl>
          </FormItem>
        );

      case 'select':
        return (
          <FormItem key={column.id}>
            <FormLabel>{column.displayName}</FormLabel>
            <FormControl>
              <Input
                placeholder={`Enter ${column.displayName.toLowerCase()}`}
                value={customFieldValues[column.fieldName] || ''}
                onChange={(e) => handleCustomFieldChange(e.target.value)}
              />
            </FormControl>
            <FormMessage className="text-xs text-muted-foreground">
              Enter a value or select from dropdown if available
            </FormMessage>
          </FormItem>
        );

      case 'labels':
        return (
          <FormItem key={column.id}>
            <FormLabel>{column.displayName}</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter labels separated by commas"
                value={customFieldValues[column.fieldName] || ''}
                onChange={(e) => handleCustomFieldChange(e.target.value)}
              />
            </FormControl>
            <FormMessage className="text-xs text-muted-foreground">
              Separate multiple labels with commas
            </FormMessage>
          </FormItem>
        );

      case 'priority':
        return (
          <FormItem key={column.id}>
            <FormLabel>{column.displayName}</FormLabel>
            <Select
              value={customFieldValues[column.fieldName] || ''}
              onValueChange={handleCustomFieldChange}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={TaskPriority.LOW}>
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Low
                  </span>
                </SelectItem>
                <SelectItem value={TaskPriority.MEDIUM}>
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    Medium
                  </span>
                </SelectItem>
                <SelectItem value={TaskPriority.HIGH}>
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    High
                  </span>
                </SelectItem>
                <SelectItem value={TaskPriority.CRITICAL}>
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Critical
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        );

      default:
        // Default to text input for unknown types
        return (
          <FormItem key={column.id}>
            <FormLabel>{column.displayName}</FormLabel>
            <FormControl>
              <Input
                placeholder={`Enter ${column.displayName.toLowerCase()}`}
                value={customFieldValues[column.fieldName] || ''}
                onChange={(e) => handleCustomFieldChange(e.target.value)}
              />
            </FormControl>
          </FormItem>
        );
    }
  };

  // Render standard field or custom field based on column
  const renderFieldForColumn = (column: ListViewColumn) => {
    const fieldName = column.fieldName;
    
    // Skip system-generated fields
    if (fieldName === 'createdAt' || fieldName === 'updatedAt' || fieldName === 'creator' || fieldName === 'creatorId') {
      return null;
    }

    // Handle standard fields with form control
    if (fieldName === 'summary') {
      return (
        <FormField
          key={column.id}
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{column.displayName}</FormLabel>
              <FormControl>
                <Input placeholder="Enter task summary" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    if (fieldName === 'issueId') {
      return (
        <FormField
          key={column.id}
          control={form.control}
          name="issueId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{column.displayName} (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Auto-generated if empty" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    if (fieldName === 'description') {
      return (
        <FormField
          key={column.id}
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{column.displayName}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter task description (optional)"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    if (fieldName === 'dueDate') {
      return (
        <FormField
          key={column.id}
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{column.displayName}</FormLabel>
              <FormControl>
                <DatePicker {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
    }

    if (fieldName === 'assigneeId' || fieldName === 'assignee') {
      if (isEmployee) {
        return (
          <div key={column.id} className="text-sm text-muted-foreground">
            <span className="font-semibold">{column.displayName}:</span> {currentUser?.name} (You)
          </div>
        );
      }
      return (
        <FormField
          key={column.id}
          control={form.control}
          name="assigneeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{column.displayName}</FormLabel>
              <Select defaultValue={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                </FormControl>
                <FormMessage />
                <SelectContent>
                  {memberOptions.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-x-2">
                        <MemberAvatar className="size-6" name={member.name} />
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      );
    }

    if (fieldName === 'status') {
      return (
        <FormField
          key={column.id}
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{column.displayName}</FormLabel>
              <Select defaultValue={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <FormMessage />
                <SelectContent>
                  <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                  <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={TaskStatus.IN_REVIEW}>In Review</SelectItem>
                  <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      );
    }

    if (fieldName === 'priority') {
      return (
        <FormField
          key={column.id}
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{column.displayName}</FormLabel>
              <Select defaultValue={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <FormMessage />
                <SelectContent>
                  <SelectItem value={TaskPriority.LOW}>
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      Low
                    </span>
                  </SelectItem>
                  <SelectItem value={TaskPriority.MEDIUM}>
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value={TaskPriority.HIGH}>
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      High
                    </span>
                  </SelectItem>
                  <SelectItem value={TaskPriority.CRITICAL}>
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      Critical
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      );
    }

    if (fieldName === 'issueType') {
      return (
        <FormField
          key={column.id}
          control={form.control}
          name="issueType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{column.displayName}</FormLabel>
              <Select defaultValue={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                </FormControl>
                <FormMessage />
                <SelectContent>
                  <SelectItem value={IssueType.TASK}>Task</SelectItem>
                  <SelectItem value={IssueType.BUG}>Bug</SelectItem>
                  <SelectItem value={IssueType.EPIC}>Epic</SelectItem>
                  <SelectItem value={IssueType.STORY}>Story</SelectItem>
                  <SelectItem value={IssueType.SUB_TASK}>Sub-task</SelectItem>
                  <SelectItem value={IssueType.IMPROVEMENT}>Improvement</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      );
    }

    // For all other fields (custom fields), use the dynamic renderer
    return renderDynamicField(column);
  };

  return (
    <Card className="w-full h-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">Create a new task</CardTitle>
      </CardHeader>
      <div className="px-7">
        <DottedSeparator />
      </div>
      <CardContent className="p-7">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              
              {/* Project Selection - Always show first for admins */}
              {isAdmin && (
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select defaultValue={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <FormMessage />
                        <SelectContent>
                          {projectOptions.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              <div className="flex items-center gap-x-2">
                                <ProjectAvatar
                                  className="size-6"
                                  name={project.name}
                                  image={project.imageUrl}
                                />
                                {project.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}

              {/* Dynamic form based on project columns */}
              {selectedProjectId && columns && columns.length > 0 ? (
                <>
                  <DottedSeparator className="my-2" />
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold">Task Details</h3>
                    <p className="text-xs text-muted-foreground">
                      Fields based on project structure
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {columns
                      .filter(col => col.isVisible)
                      .sort((a, b) => a.position - b.position)
                      .map(col => renderFieldForColumn(col))}
                  </div>
                </>
              ) : (
                // Fallback to standard form if no project selected or no columns
                <>
                  <FormField
                    control={form.control}
                    name="summary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Summary</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter task summary" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter task description (optional)"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <DatePicker {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {isAdmin && (
                    <FormField
                      control={form.control}
                      name="assigneeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assignee</FormLabel>
                          <Select
                            defaultValue={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select assignee" />
                              </SelectTrigger>
                            </FormControl>
                            <FormMessage />
                            <SelectContent>
                              {memberOptions.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  <div className="flex items-center gap-x-2">
                                    <MemberAvatar
                                      className="size-6"
                                      name={member.name}
                                    />
                                    {member.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}
                  {isEmployee && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold">Assignee:</span> {currentUser?.name} (You)
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          defaultValue={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <FormMessage />
                          <SelectContent>
                            <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                            <SelectItem value={TaskStatus.IN_PROGRESS}>
                              In Progress
                            </SelectItem>
                            <SelectItem value={TaskStatus.IN_REVIEW}>
                              In Review
                            </SelectItem>
                            <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select
                            defaultValue={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <FormMessage />
                            <SelectContent>
                              <SelectItem value={TaskPriority.LOW}>
                                <span className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                  Low
                                </span>
                              </SelectItem>
                              <SelectItem value={TaskPriority.MEDIUM}>
                                <span className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                  Medium
                                </span>
                              </SelectItem>
                              <SelectItem value={TaskPriority.HIGH}>
                                <span className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                                  High
                                </span>
                              </SelectItem>
                              <SelectItem value={TaskPriority.CRITICAL}>
                                <span className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                  Critical
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    {isAdmin && (
                      <FormField
                        control={form.control}
                        name="issueType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Issue Type</FormLabel>
                            <Select
                              defaultValue={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select issue type" />
                                </SelectTrigger>
                              </FormControl>
                              <FormMessage />
                              <SelectContent>
                                <SelectItem value={IssueType.TASK}>
                                  Task
                                </SelectItem>
                                <SelectItem value={IssueType.BUG}>
                                  Bug
                                </SelectItem>
                                <SelectItem value={IssueType.EPIC}>
                                  Epic
                                </SelectItem>
                                <SelectItem value={IssueType.STORY}>
                                  Story
                                </SelectItem>
                                <SelectItem value={IssueType.SUB_TASK}>
                                  Sub-task
                                </SelectItem>
                                <SelectItem value={IssueType.IMPROVEMENT}>
                                  Improvement
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
            <DottedSeparator className="py-7" />
            <div className="flex items-center justify-between">
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={onCancel}
                disabled={isPending}
                className={cn(!onCancel && "invisible")}
              >
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={isPending}>
                Create Task
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
