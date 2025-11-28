import { ExternalLink, PencilIcon, TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { useConfirm } from "@/hooks/use-confirm";
import { ConditionalGuard } from "@/components/permission-guard";
import { usePermissionContext } from "@/components/providers/permission-provider";
import { MemberRole } from "@/features/members/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

import { useDeleteTask } from "../api/use-delete-task";
import { useEditTaskModal } from "../hooks/use-edit-task-modal";

interface TaskActionsProps {
  id: string;
  projectId: string | null;
  assigneeId?: string;
  children: React.ReactNode;
}

export const TaskActions = ({ id, projectId, assigneeId, children }: TaskActionsProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const permissions = usePermissionContext();

  const { open } = useEditTaskModal();

  const [ConfirmDialog, confirm] = useConfirm(
    "Delete Task",
    "This action cannot be undone.",
    "destructive"
  );
  const { mutate, isPending } = useDeleteTask();

  // Check permissions
  // For employees: only allow editing/deleting individual tasks (projectId === null) that they own
  const isIndividualTask = projectId === null;
  const canEdit = isIndividualTask 
    ? permissions.canEditTask(assigneeId)  // Individual task - check ownership
    : permissions.role === MemberRole.ADMIN || permissions.role === MemberRole.PROJECT_MANAGER; // Project task - admin only
  
  const canDelete = isIndividualTask
    ? permissions.canDeleteTask(assigneeId, projectId)  // Individual task - check ownership
    : permissions.role === MemberRole.ADMIN || permissions.role === MemberRole.PROJECT_MANAGER; // Project task - admin only

  const onDelete = async () => {
    const ok = await confirm();
    if (!ok) return;

    mutate(
      { param: { taskId: id } },
      {
        onSuccess: () => {
          // Navigate and force refresh to ensure fresh data
          router.push(`/workspaces/${workspaceId}/tasks`);
          router.refresh();
        },
      }
    );
  };

  const onOpenTask = () => {
    router.push(`/workspaces/${workspaceId}/tasks/${id}`);
  };

  const onOpenProject = () => {
    router.push(`/workspaces/${workspaceId}/projects/${projectId}`);
  };

  return (
    <div className="flex justify-end">
      <ConfirmDialog />
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={onOpenTask}
            className="font-medium p-[10px]"
          >
            <ExternalLink className="size-4 mr-2 stroke-2" />
            Task Details
          </DropdownMenuItem>
          {canEdit && (
            <DropdownMenuItem
              onClick={() => {
                open(id);
              }}
              className="font-medium p-[10px]"
            >
              <PencilIcon className="size-4 mr-2 stroke-2" />
              Edit Task
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem
              onClick={onDelete}
              disabled={isPending}
              className="text-amber-700 focus:text-amber-700 font-medium p-[10px]"
            >
              <TrashIcon className="size-4 mr-2 stroke-2" />
              Delete Task
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
