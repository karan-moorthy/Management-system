"use client";

import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateBugForm } from "./create-bug-form";

interface CreateBugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateBugModal = ({ isOpen, onClose }: CreateBugModalProps) => {
  const workspaceId = useWorkspaceId();
  const { data: members } = useGetMembers({ workspaceId });

  const memberOptions = members?.documents
    ? members.documents.map((member) => ({
        id: member.id,
        name: member.name,
      }))
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
        </DialogHeader>
        <CreateBugForm onCancel={onClose} memberOptions={memberOptions} />
      </DialogContent>
    </Dialog>
  );
};
