"use client";

import { Fragment } from "react";
import { ArrowLeft, MoreVerticalIcon, Plus, UserPlus, Mail } from "lucide-react";
import Link from "next/link";

import { MemberAvatar } from "@/features/members/components/member-avatar";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useDeleteMember } from "@/features/members/api/use-delete-member";
import { useUpdateMember } from "@/features/members/api/use-update-member";
import { MemberRole } from "@/features/members/types";

// Helper function to get role display name
const getRoleDisplayName = (role: MemberRole): string => {
  const names: Record<MemberRole, string> = {
    [MemberRole.ADMIN]: "Administrator",
    [MemberRole.PROJECT_MANAGER]: "Project Manager",
    [MemberRole.TEAM_LEAD]: "Team Lead",
    [MemberRole.EMPLOYEE]: "Employee",
    [MemberRole.MANAGEMENT]: "Management",
    [MemberRole.MEMBER]: "Member",
    [MemberRole.CLIENT]: "Client",
  };
  return names[role] || role;
};

// Helper function to get role badge color
const getRoleBadgeColor = (role: MemberRole): string => {
  const colors: Record<MemberRole, string> = {
    [MemberRole.ADMIN]: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    [MemberRole.PROJECT_MANAGER]: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    [MemberRole.TEAM_LEAD]: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
    [MemberRole.EMPLOYEE]: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    [MemberRole.MANAGEMENT]: "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400",
    [MemberRole.MEMBER]: "bg-slate-100 text-slate-700 dark:bg-slate-950/30 dark:text-slate-400",
    [MemberRole.CLIENT]: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
  };
  return colors[role] || "bg-gray-100 text-gray-700";
};


import { useConfirm } from "@/hooks/use-confirm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DottedSeparator } from "@/components/dotted-separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

import { InviteMemberModal } from "@/features/invitations/components/invite-member-modal";
import { useInviteMemberModal } from "@/features/invitations/hooks/use-invite-member-modal";
import { AddMemberModal } from "@/features/members/components/add-member-modal";
import { useAddMemberModal } from "@/features/members/hooks/use-add-member-modal";

export const MembersList = () => {
  const workspaceId = useWorkspaceId();
  const { isOpen, setIsOpen } = useInviteMemberModal();
  const { isOpen: isAddMemberOpen, setIsOpen: setIsAddMemberOpen } = useAddMemberModal();
  const [ConfirmDialog, confirm] = useConfirm(
    "Remove member",
    "This member will be removed from the workspace.",
    "destructive"
  );

  const { data } = useGetMembers({ workspaceId });
  const { mutate: deleteMember, isPending: isDeletingMember } =
    useDeleteMember();
  const { mutate: updateMember, isPending: isUpdatingMember } =
    useUpdateMember();

  const handleUpdateMember = (memberId: string, role: MemberRole) => {
    updateMember({ json: { role }, param: { memberId } });
  };

  const handleDeleteMember = async (memberId: string) => {
    const ok = await confirm();

    if (!ok) return;

    deleteMember(
      { param: { memberId } },
      {
        onSuccess: () => {
          window.location.reload();
        },
      }
    );
  };

  return (
    <>
      <InviteMemberModal
        open={isOpen}
        setOpen={setIsOpen}
        workspaceId={workspaceId}
      />
      <AddMemberModal
        open={isAddMemberOpen}
        setOpen={setIsAddMemberOpen}
        workspaceId={workspaceId}
      />
      <Card className="size-full border-none shadow-none">
        <ConfirmDialog />
        <CardHeader className="flex flex-row items-center gap-x-4 p-7 space-y-0">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/workspaces/${workspaceId}`}>
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Link>
          </Button>
          <CardTitle className="text-xl font-bold">Members List</CardTitle>
          <div className="flex gap-2 ml-auto">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setIsAddMemberOpen(true)}
            >
              <UserPlus className="size-4 mr-2" />
              Add Existing
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              onClick={() => setIsOpen(true)}
            >
              <Mail className="size-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        </CardHeader>
      <div className="px-7">
        <DottedSeparator />
      </div>
      <CardContent className="p-7">
        {data?.documents.map((member, index) => (
          <Fragment key={member.id}>
            <div className="flex items-center gap-4">
              <MemberAvatar
                className="size-10 flex-shrink-0"
                fallbackClassName="text-lg"
                name={member.name}
              />
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(member.role as MemberRole)}`}>
                    {getRoleDisplayName(member.role as MemberRole)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="flex-shrink-0" variant="secondary" size="icon">
                    <MoreVerticalIcon className="size-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="end">
                  <DropdownMenuItem
                    className="font-medium"
                    onClick={() =>
                      handleUpdateMember(member.id, MemberRole.ADMIN)
                    }
                    disabled={isUpdatingMember}
                  >
                    Set as Administrator
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="font-medium"
                    onClick={() =>
                      handleUpdateMember(member.id, MemberRole.PROJECT_MANAGER)
                    }
                    disabled={isUpdatingMember}
                  >
                    Set as Project Manager
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="font-medium"
                    onClick={() =>
                      handleUpdateMember(member.id, MemberRole.TEAM_LEAD)
                    }
                    disabled={isUpdatingMember}
                  >
                    Set as Team Lead
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="font-medium"
                    onClick={() =>
                      handleUpdateMember(member.id, MemberRole.EMPLOYEE)
                    }
                    disabled={isUpdatingMember}
                  >
                    Set as Employee
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="font-medium"
                    onClick={() =>
                      handleUpdateMember(member.id, MemberRole.MANAGEMENT)
                    }
                    disabled={isUpdatingMember}
                  >
                    Set as Management
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="font-medium text-amber-700 dark:text-amber-400"
                    onClick={() =>
                      handleDeleteMember(member.id)
                    }
                    disabled={isDeletingMember}
                  >
                    Remove {member.name}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {index < data.documents.length - 1 && (
              <Separator className="my-2.5" />
            )}
          </Fragment>
        ))}
      </CardContent>
    </Card>
    </>
  );
};
