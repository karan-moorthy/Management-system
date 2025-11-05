"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { DottedSeparator } from "@/components/dotted-separator";
import { ResponsiveModal } from "@/components/responsive-modal";

import { useAddMemberDirect } from "../api/use-add-member-direct";
import { MemberRole } from "../types";

const addMemberSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.nativeEnum(MemberRole),
});

type AddMemberFormValues = z.infer<typeof addMemberSchema>;

interface AddMemberModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  workspaceId: string;
}

export const AddMemberModal = ({ open, setOpen, workspaceId }: AddMemberModalProps) => {
  const { mutate: addMember, isPending } = useAddMemberDirect();

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      email: "",
      role: MemberRole.MEMBER,
    },
  });

  const onSubmit = (values: AddMemberFormValues) => {
    addMember(
      {
        json: {
          ...values,
          workspaceId,
        },
      },
      {
        onSuccess: () => {
          form.reset();
          setOpen(false);
        },
      }
    );
  };

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <Card className="w-full h-full border-none shadow-none">
        <CardHeader className="p-7">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="size-5" />
            Add Existing Member
          </CardTitle>
          <CardDescription>
            Add an existing user to your workspace. They must already have an account.
          </CardDescription>
        </CardHeader>
        <div className="px-7">
          <DottedSeparator />
        </div>
        <CardContent className="p-7">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isPending}
                        type="email"
                        placeholder="Enter user's email address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      disabled={isPending}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={MemberRole.ADMIN}>
                          Administrator
                        </SelectItem>
                        <SelectItem value={MemberRole.MEMBER}>
                          Member
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DottedSeparator className="py-7" />
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="w-full lg:w-fit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isPending}
                  className="w-full lg:w-fit"
                >
                  {isPending ? "Adding..." : "Add Member"}
                </Button>
              </div>
            </form>
          </Form>

          <div className="mt-6 pt-6 border-t">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800 text-left">
                  <p className="font-medium mb-1">How this works:</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>• The user must already have an account on this system</li>
                    <li>• They will be instantly added to your workspace</li>
                    <li>• Use invitations for users who don't have accounts yet</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </ResponsiveModal>
  );
};