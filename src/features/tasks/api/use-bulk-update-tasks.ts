import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<
  (typeof client.api.tasks)["bulk-update"]["$post"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.tasks)["bulk-update"]["$post"]
>;

export const useBulkUpdateTasks = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      console.log("📤 Sending bulk update request:", json);
      const response = await client.api.tasks["bulk-update"].$post({
        json,
      });

      if (!response.ok) {
        console.error("❌ Bulk update failed with status:", response.status);
        throw new Error("Failed to update tasks.");
      }

      const result = await response.json();
      console.log("✅ Bulk update successful:", result);
      return result;
    },
    onSuccess: () => {
      toast.success("Tasks updated.");
      queryClient.invalidateQueries({ queryKey: ["project-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => {
      toast.error("Failed to update tasks.");
    },
  });

  return mutation;
};
