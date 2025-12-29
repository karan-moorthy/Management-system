"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { DialogTitle } from "@/components/ui/dialog";

import { EditTaskFormWrapper } from "./edit-task-form-wrapper";

import { useEditTaskModal } from "../hooks/use-edit-task-modal";

export const EditTaskModal = () => {
  const { taskId, close } = useEditTaskModal();

  return (
    <ResponsiveModal open={!!taskId} onOpenChange={close}>
      <DialogTitle className="sr-only">Edit Task</DialogTitle>
      {taskId && <EditTaskFormWrapper id={taskId} onCancel={close} />}
    </ResponsiveModal>
  );
};
