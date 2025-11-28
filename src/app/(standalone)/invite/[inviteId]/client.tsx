"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DottedSeparator } from "@/components/dotted-separator";

import { useGetInvitationInfo } from "@/features/invitations/api/use-get-invitation-info";
import { useAcceptInvite } from "@/features/invitations/api/use-accept-invite";
import { InvitationStatus } from "@/features/invitations/types";

export const InviteClient = () => {
  const router = useRouter();
  const params = useParams();
  const inviteId = params.inviteId as string;
  
  const { data: invitationData, isLoading } = useGetInvitationInfo({ inviteId });
  const { mutate: acceptInvite, isPending } = useAcceptInvite();

  const handleAccept = () => {
    acceptInvite(
      { param: { invitationId: inviteId } },
      {
        onSuccess: ({ data }) => {
          router.push(`/workspaces/${data.workspaceId}`);
        },
      }
    );
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!invitationData) {
    return <PageError message="Invitation not found." />;
  }

  const { workspace, status, expiresAt, ...invitation } = invitationData;

  if (status !== InvitationStatus.PENDING) {
    let message = "This invitation is no longer valid.";
    if (status === InvitationStatus.ACCEPTED) {
      message = "This invitation has already been accepted.";
    } else if (status === InvitationStatus.EXPIRED) {
      message = "This invitation has expired.";
    } else if (status === InvitationStatus.DECLINED) {
      message = "This invitation was declined.";
    }
    
    return <PageError message={message} />;
  }

  // Check if invitation has expired
  if (new Date() > new Date(expiresAt)) {
    return <PageError message="This invitation has expired." />;
  }

  return (
    <div className="w-full lg:max-w-xl">
      <Card className="size-full border-none shadow-none">
        <CardHeader className="p-7">
          <CardTitle className="text-xl font-bold">Join workspace</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join <strong>{workspace.name}</strong>{" "}
            workspace.
          </CardDescription>
        </CardHeader>
        <div className="px-7">
          <DottedSeparator />
        </div>
        <CardContent className="p-7">
          <div className="flex flex-col lg:flex-row gap-2 items-center justify-between">
            <Button
              size="lg"
              variant="secondary"
              type="button"
              asChild
              className="w-full lg:w-fit"
              disabled={isPending}
            >
              <Link href="/">Cancel</Link>
            </Button>
            <Button
              size="lg"
              type="button"
              className="w-full lg:w-fit"
              onClick={handleAccept}
              disabled={isPending}
            >
              Join Workspace
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};