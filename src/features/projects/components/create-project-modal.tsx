"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { DialogTitle } from "@/components/ui/dialog";

import { CreateProjectForm } from "./create-project-form";

import { useCreateProjectModal } from "../hooks/use-create-project-modal";

export const CreateProjectModal = () => {
  const { isOpen, setIsOpen, close } = useCreateProjectModal();

  return (
    <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
      <DialogTitle className="sr-only">Create Project</DialogTitle>
      <CreateProjectForm onCancel={close} />
    </ResponsiveModal>
  );
};
