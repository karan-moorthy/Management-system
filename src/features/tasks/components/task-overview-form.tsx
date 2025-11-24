"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, X, File } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTaskOverview } from "@/features/tasks/api/use-create-task-overview";
import { Task } from "../types";

const taskOverviewSchema = z.object({
  description: z.string().min(10, "Please provide a description (minimum 10 characters)"),
  outputFile: z.string().optional(),
});

type TaskOverviewFormValues = z.infer<typeof taskOverviewSchema>;

interface TaskOverviewFormProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TaskOverviewForm({
  task,
  isOpen,
  onClose,
  onSuccess,
}: TaskOverviewFormProps) {
  const { mutate: createOverview, isPending } = useCreateTaskOverview();
  
  const [outputFile, setOutputFile] = useState<string>("");

  const form = useForm<TaskOverviewFormValues>({
    resolver: zodResolver(taskOverviewSchema),
    defaultValues: {
      description: "",
      outputFile: "",
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    // TODO: Implement actual file upload to cloud storage (S3, Cloudinary, etc.)
    // For now, we'll create a placeholder URL
    const file = uploadedFiles[0];
    const fileUrl = URL.createObjectURL(file); // Temporary local URL
    setOutputFile(fileUrl);
  };

  const onSubmit = (values: TaskOverviewFormValues) => {
    createOverview(
      {
        taskId: task.id,
        completedWorkDescription: values.description,
        completionMethod: "Completed as per requirements",
        stepsFollowed: "Standard workflow followed",
        proofOfWork: {
          files: outputFile ? [outputFile] : undefined,
        },
      },
      {
        onSuccess: () => {
          form.reset();
          setOutputFile("");
          onSuccess?.();
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Completion Overview</DialogTitle>
          <DialogDescription>
            Complete the form below to submit your task for review
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Project Details Section */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-base">Project Details</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-semibold">Task:</span> {task.summary}
                </p>
                <p>
                  <span className="font-semibold">Task ID:</span> {task.issueId}
                </p>
                <p>
                  <span className="font-semibold">Assignee:</span> {task.assignee?.name || "Unassigned"}
                </p>
                {task.project && (
                  <p>
                    <span className="font-semibold">Project:</span> {task.project.name}
                  </p>
                )}
              </div>
            </div>

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">
                    Description <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Provide a brief description of the completed work..."
                      className="min-h-[120px] resize-y"
                    />
                  </FormControl>
                  <FormDescription>
                    Describe what you accomplished and how you completed this task
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional File Upload */}
            <div className="space-y-2">
              <FormLabel className="text-base">
                Expected Output File (Optional)
              </FormLabel>
              <Input
                type="file"
                onChange={handleFileUpload}
                className="cursor-pointer"
                accept="*/*"
              />
              <FormDescription>
                Upload the output file or deliverable (if applicable)
              </FormDescription>
              {outputFile && (
                <div className="flex items-center justify-between bg-muted p-3 rounded mt-2">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate">{outputFile.split('/').pop() || "Uploaded file"}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOutputFile("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
