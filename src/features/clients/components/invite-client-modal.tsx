"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Loader2, Mail, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useSendClientInvitation } from "@/features/clients/api/use-client-invitations";
import { toast } from "sonner";

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteClientModalProps {
  projectId: string;
  projectName: string;
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteClientModal({
  projectId,
  projectName,
  workspaceId,
  isOpen,
  onClose,
}: InviteClientModalProps) {
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [invitedEmail, setInvitedEmail] = useState<string>("");

  const { mutate: sendInvitation, isPending } = useSendClientInvitation();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
    },
  });

  // Debug modal props
  console.log('InviteClientModal rendered:', { projectId, projectName, workspaceId, isOpen });

  const onSubmit = (values: InviteFormValues) => {
    console.log('Form submitted:', values);
    
    sendInvitation(
      {
        email: values.email,
        projectId,
        workspaceId,
      },
      {
        onSuccess: (data) => {
          console.log('Invitation response:', data);
          
          // Generate link from token
          const baseUrl = window.location.origin;
          const token = data.data.token;
          
          if (!token) {
            toast.error('Failed to generate invitation token');
            console.error('No token in response:', data);
            return;
          }
          
          const link = `${baseUrl}/client/accept?token=${token}`;
          setInvitationLink(link);
          setInvitedEmail(values.email);
          
          // Show email status
          if (data.data.emailSent === false) {
            toast.warning('Invitation created but email failed to send. Please copy the link manually.');
          } else {
            toast.success('Invitation sent successfully!');
          }
        },
        onError: (error) => {
          console.error('Invitation error:', error);
          toast.error(error.message || 'Failed to send invitation');
        },
      }
    );
  };

  const copyToClipboard = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      toast.success("Invitation link copied to clipboard");
    }
  };

  const handleClose = () => {
    setInvitationLink(null);
    setInvitedEmail("");
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Client to Project</DialogTitle>
          <DialogDescription>
            Send an invitation to a client to give them read-only access to <strong>{projectName}</strong>
          </DialogDescription>
        </DialogHeader>

        {!invitationLink ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="client@example.com"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      The client will receive an invitation link to create their account
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Invitation sent successfully!</span>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                An invitation has been sent to <strong>{invitedEmail}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                You can also share this link directly:
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                value={invitationLink}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> This invitation link expires in 7 days. The client will have
                read-only access to this project only.
              </p>
            </div>

            <Button
              onClick={handleClose}
              className="w-full"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
