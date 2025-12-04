"use client";

import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, Upload, X } from "lucide-react";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { createBugSchema } from "../schemas";
import { useCreateBug } from "../api/use-create-bug";
import { useGetBugTypes } from "../api/use-get-bug-types";
import { useCreateBugType } from "../api/use-create-bug-type";
import { BugPriority } from "../types";

interface CreateBugFormProps {
  onCancel?: () => void;
  memberOptions: { id: string; name: string }[];
}

export const CreateBugForm = ({
  onCancel,
  memberOptions,
}: CreateBugFormProps) => {
  const workspaceId = useWorkspaceId();
  const { mutate: createBug, isPending } = useCreateBug();
  const { data: bugTypes = [], isLoading: loadingBugTypes } = useGetBugTypes();
  const { mutate: createBugType, isPending: creatingBugType } = useCreateBugType();
  
  const [showAddBugType, setShowAddBugType] = useState(false);
  const [newBugTypeName, setNewBugTypeName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const form = useForm<z.infer<typeof createBugSchema>>({
    resolver: zodResolver(createBugSchema.omit({ workspaceId: true })),
    defaultValues: {
      assignedTo: undefined,
      bugType: "Development",
      bugDescription: "",
      fileUrl: undefined,
      priority: BugPriority.MEDIUM,
    },
  });

  const handleAddBugType = () => {
    if (!newBugTypeName.trim()) return;
    
    createBugType(
      { json: { name: newBugTypeName.trim() } },
      {
        onSuccess: () => {
          setNewBugTypeName("");
          setShowAddBugType(false);
          form.setValue("bugType", newBugTypeName.trim());
        },
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
      
      // For now, we'll store the file name
      // In production, you'd upload to a file storage service
      form.setValue("fileUrl", file.name);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    form.setValue("fileUrl", undefined);
  };

  const onSubmit = (values: z.infer<typeof createBugSchema>) => {
    const payload = {
      ...values,
      workspaceId,
    };
    
    createBug(
      { json: payload },
      {
        onSuccess: () => {
          form.reset();
          setSelectedFile(null);
          setFilePreview(null);
          onCancel?.();
        },
      }
    );
  };

  return (
    <Card className="w-full h-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">Create Bug Report</CardTitle>
      </CardHeader>
      <div className="px-7">
        <DottedSeparator />
      </div>
      <CardContent className="p-7">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To *</FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bug fixer" />
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

              <FormField
                control={form.control}
                name="bugType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span>Bug Type *</span>
                      <Dialog open={showAddBugType} onOpenChange={setShowAddBugType}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-primary hover:text-primary/80"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Type
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add New Bug Type</DialogTitle>
                            <DialogDescription>
                              Create a new bug type category
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter bug type name"
                              value={newBugTypeName}
                              onChange={(e) => setNewBugTypeName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddBugType();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              onClick={handleAddBugType}
                              disabled={creatingBugType || !newBugTypeName.trim()}
                            >
                              Add
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </FormLabel>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select bug type" />
                        </SelectTrigger>
                      </FormControl>
                      <FormMessage />
                      <SelectContent>
                        {loadingBugTypes ? (
                          <SelectItem value="loading" disabled>
                            Loading...
                          </SelectItem>
                        ) : bugTypes.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No bug types available
                          </SelectItem>
                        ) : (
                          bugTypes.map((type) => (
                            <SelectItem key={type.id} value={type.name}>
                              {type.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bugDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bug Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the bug in detail..."
                        className="resize-none min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        <SelectItem value={BugPriority.LOW}>
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Low
                          </span>
                        </SelectItem>
                        <SelectItem value={BugPriority.MEDIUM}>
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            Medium
                          </span>
                        </SelectItem>
                        <SelectItem value={BugPriority.HIGH}>
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            High
                          </span>
                        </SelectItem>
                        <SelectItem value={BugPriority.CRITICAL}>
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

              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Choose File (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {!selectedFile ? (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById("bug-file-input")?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Choose File
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              No file selected
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-2 border rounded">
                              {filePreview && (
                                <img
                                  src={filePreview}
                                  alt="Preview"
                                  className="h-12 w-12 object-cover rounded"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {selectedFile.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(selectedFile.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={removeFile}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        <input
                          id="bug-file-input"
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          accept="image/*,.pdf,.doc,.docx,.txt"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                Create Bug Report
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
