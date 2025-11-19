import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.activity.$post>;
type RequestType = InferRequestType<typeof client.api.activity.$post>["json"];

export const useCreateActivityLog = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api.activity.$post({ json });

      if (!response.ok) {
        throw new Error("Failed to log activity");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate activity logs queries
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      
      console.log("📝 Activity logged successfully");
    },
    onError: (error) => {
      console.error("Failed to log activity:", error);
      // Don't show toast for activity log errors (silent failure)
    },
  });

  return mutation;
};
