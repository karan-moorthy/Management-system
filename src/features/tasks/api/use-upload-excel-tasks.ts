import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UploadExcelTasksProps {
  file: File;
  workspaceId: string;
  projectId: string;
}

export const useUploadExcelTasks = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ file, workspaceId, projectId }: UploadExcelTasksProps) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspaceId', workspaceId);
      formData.append('projectId', projectId);

      const response = await fetch('/api/tasks/upload-excel', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload Excel file');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.data.message);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return mutation;
};