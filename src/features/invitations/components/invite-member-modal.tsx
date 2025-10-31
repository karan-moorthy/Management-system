"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Mail, CheckCircle2, User } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { DottedSeparator } from "@/components/dotted-separator";
import { ResponsiveModal } from "@/components/responsive-modal";

import { useInviteMember } from "../api/use-invite-member";
import { inviteMemberSchema } from "../schemas";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

interface InviteMemberModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  workspaceId: string;
}

export const InviteMemberModal = ({
  open,
  setOpen,
  workspaceId,
}: InviteMemberModalProps) => {
  const [emailSent, setEmailSent] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string>("");
  const { mutate, isPending } = useInviteMember();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    mutate(
      { json: { ...values, workspaceId } },
      {
        onSuccess: (data) => {
          setEmailSent(true);
          setInvitedEmail(values.email);
          form.reset();
        },
      }
    );
  };

  const handleClose = () => {
    setOpen(false);
    setEmailSent(false);
    setInvitedEmail("");
    form.reset();
  };

  return (
    <ResponsiveModal open={open} onOpenChange={handleClose}>
      <Card className="w-full h-full border-none shadow-none">
        <CardHeader className="p-7">
          <CardTitle className="text-xl font-bold">
            {emailSent ? "Invitation Sent!" : "Invite Member"}
          </CardTitle>
          <CardDescription>
            {emailSent 
              ? "We've sent an email invitation to the member." 
              : "Send an invitation email to add a new member to your workspace."
            }
          </CardDescription>
        </CardHeader>
        <div className="px-7">
          <DottedSeparator />
        </div>
        <CardContent className="p-7">
          {emailSent ? (
            <div className="space-y-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Email Sent Successfully!</h3>
                  <p className="text-muted-foreground">
                    We've sent an invitation email to <strong>{invitedEmail}</strong>
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 text-left">
                    <p className="font-medium mb-1">What happens next?</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• The user will receive an email with a join link</li>
                      <li>• They can sign up or sign in when clicking the link</li>
                      <li>• Once they join, they'll be automatically added to your workspace</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <Button
                type="button"
                size="lg"
                onClick={handleClose}
                className="w-full"
              >
                Done
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter email address"
                          disabled={isPending}
                        />
                      </FormControl>
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
                    onClick={handleClose}
                    disabled={isPending}
                    className="w-full lg:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isPending}
                    className="w-full lg:w-auto"
                  >
                    Send Invitation
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </ResponsiveModal>
  );
};