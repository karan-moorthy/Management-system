"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { DialogTitle } from "@/components/ui/dialog";

import { CreateWorkspaceForm } from "./create-workspace-form";

import { useCreateWorkspaceModal } from "../hooks/use-create-workspace-modal";

export const CreateWorkspaceModal = () => {
  const { isOpen, setIsOpen, close } = useCreateWorkspaceModal();

  return (
    <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
      <DialogTitle className="sr-only">Create Workspace</DialogTitle>
      <CreateWorkspaceForm onCancel={close} />
    </ResponsiveModal>
  );
};
