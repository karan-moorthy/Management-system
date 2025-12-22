"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Loader2, Mail, Trash2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGetClientInvitations, useRevokeClientInvitation } from "@/features/clients/api/use-client-invitations";
import { InviteClientModal } from "./invite-client-modal";

interface ClientInvitationsProps {
  projectId: string;
  projectName: string;
  workspaceId: string;
}

export function ClientInvitations({ projectId, projectName, workspaceId }: ClientInvitationsProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [invitationToRevoke, setInvitationToRevoke] = useState<string | null>(null);

  const { data: invitations, isLoading } = useGetClientInvitations(projectId);
  const { mutate: revokeInvitation, isPending: isRevoking } = useRevokeClientInvitation();

  const handleRevoke = () => {
    if (invitationToRevoke) {
      revokeInvitation(
        { invitationId: invitationToRevoke, projectId },
        {
          onSuccess: () => {
            setInvitationToRevoke(null);
          },
        }
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Accepted</Badge>;
      case "expired":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Expired</Badge>;
      case "revoked":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Client Invitations</CardTitle>
              <CardDescription>
                Manage client access to this project. Clients have read-only access.
              </CardDescription>
            </div>
            <Button onClick={() => setIsInviteModalOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Client
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : invitations && invitations.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invited By</TableHead>
                    <TableHead>Invited On</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {invitation.email}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                      <TableCell>{invitation.invitedBy?.name || "Unknown"}</TableCell>
                      <TableCell>
                        {invitation.createdAt ? format(new Date(invitation.createdAt), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        {invitation.expiresAt ? format(new Date(invitation.expiresAt), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {invitation.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setInvitationToRevoke(invitation.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No client invitations yet. Click "Invite Client" to send an invitation.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <InviteClientModal
        projectId={projectId}
        projectName={projectName}
        workspaceId={workspaceId}
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      <AlertDialog open={!!invitationToRevoke} onOpenChange={(open) => !open && setInvitationToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this invitation? The client will no longer be able to
              accept this invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
