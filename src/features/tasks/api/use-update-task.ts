import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<
  (typeof client.api.tasks)[":taskId"]["$patch"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.tasks)[":taskId"]["$patch"]
>;

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, json }) => {
      const response = await client.api.tasks[":taskId"].$patch({
        param,
        json,
      });

      if (!response.ok) {
        throw new Error("Failed to update task.");
      }

      return await response.json();
    },
    onSuccess: ({ data }) => {
      toast.success("Task updated.");
      
      // Invalidate all task-related queries to ensure UI updates
      queryClient.invalidateQueries({ 
        queryKey: ["tasks"],
      });
      
      // Invalidate specific task query
      queryClient.invalidateQueries({ 
        queryKey: ["task", data.id],
      });
      
      // Invalidate analytics
      if (data.projectId) {
        queryClient.invalidateQueries({ 
          queryKey: ["project-analytics", data.projectId],
        });
      }
      if (data.workspaceId) {
        queryClient.invalidateQueries({ 
          queryKey: ["workspace-analytics", data.workspaceId],
        });
      }
      
      // Invalidate activity logs to show recent changes
      queryClient.invalidateQueries({
        queryKey: ["activity-logs"],
      });
    },
    onError: () => {
      toast.error("Failed to update task.");
    },
  });

  return mutation;
};
