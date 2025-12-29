"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { DialogTitle } from "@/components/ui/dialog";

import { CreateTaskFormWrapper } from "./create-task-form-wrapper";

import { useCreateTaskModal } from "../hooks/use-create-task-modal";

export const CreateTaskModal = () => {
  const { isOpen, setIsOpen, close } = useCreateTaskModal();

  return (
    <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
      <DialogTitle className="sr-only">Create Task</DialogTitle>
      <CreateTaskFormWrapper onCancel={close} />
    </ResponsiveModal>
  );
};
