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
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('workspaceId', workspaceId);
        formData.append('projectId', projectId);

        console.log('📤 Uploading file:', {
          fileName: file.name,
          fileSize: file.size,
          workspaceId,
          projectId,
        });

        // Increase timeout for large files - use AbortController with 5 minute timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes

        const response = await fetch('/api/tasks/upload-excel', {
          method: 'POST',
          credentials: 'include', // Include cookies for authentication
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('📥 Upload response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        });

        if (!response.ok) {
          let errorMessage = 'Failed to upload Excel file';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // If response is not JSON, use status text
            errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('✅ Upload successful:', result);
        return result;
      } catch (error) {
        console.error('❌ Upload error:', error);
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('Upload timed out. The file might be too large or the server is busy.');
          } else if (error.message.includes('fetch') || error.message.includes('network')) {
            throw new Error('Network error: Please check your connection and try again.');
          }
        }
        throw error;
      }
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