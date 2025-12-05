"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const addColumnSchema = z.object({
  name: z.string().min(1, "Column name is required"),
  key: z.string().min(1, "Column key is required"),
  category: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  color: z.string().optional(),
});

type AddColumnFormValues = z.infer<typeof addColumnSchema>;

interface AddColumnButtonProps {
  workspaceId: string;
  onColumnAdded?: (column: any) => void;
}

export const AddColumnButton = ({ workspaceId, onColumnAdded }: AddColumnButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<AddColumnFormValues>({
    resolver: zodResolver(addColumnSchema),
    defaultValues: {
      name: "",
      key: "",
      category: "TODO",
      color: "#gray",
    },
  });

  const onSubmit = async (values: AddColumnFormValues) => {
    try {
      // TODO: Call API to create new status/column
      console.log("Creating column:", values);
      
      // For now, we'll use a simplified approach
      // In production, this should call your workflow/status API
      
      onColumnAdded?.({
        ...values,
        id: `custom_${Date.now()}`,
      });
      
      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error("Failed to create column:", error);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 border-2 border-dashed hover:border-solid"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="size-4 mr-2" />
        Add column
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Column</DialogTitle>
            <DialogDescription>
              Create a new column for your board. This will add a new status to your workflow.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Column Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., In QA Testing"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Auto-generate key from name
                          const key = e.target.value
                            .toLowerCase()
                            .replace(/\s+/g, "_")
                            .replace(/[^a-z0-9_]/g, "");
                          form.setValue("key", key);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Column Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., in_qa_testing"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TODO">To Do (Backlog)</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress (Active Work)</SelectItem>
                        <SelectItem value="DONE">Done (Completed)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="#gray">Gray</SelectItem>
                        <SelectItem value="#red">Red</SelectItem>
                        <SelectItem value="#orange">Orange</SelectItem>
                        <SelectItem value="#yellow">Yellow</SelectItem>
                        <SelectItem value="#green">Green</SelectItem>
                        <SelectItem value="#blue">Blue</SelectItem>
                        <SelectItem value="#purple">Purple</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Add Column
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
