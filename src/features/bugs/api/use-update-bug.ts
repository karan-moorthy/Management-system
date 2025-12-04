import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<(typeof client.api.bugs)[":bugId"]["$patch"], 200>;
type RequestType = InferRequestType<(typeof client.api.bugs)[":bugId"]["$patch"]>;

export const useUpdateBug = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, json }) => {
      const response = await client.api.bugs[":bugId"].$patch({ param, json });

      if (!response.ok) {
        throw new Error("Failed to update bug");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Bug updated successfully");
      queryClient.invalidateQueries({ queryKey: ["bugs"] });
    },
    onError: () => {
      toast.error("Failed to update bug");
    },
  });

  return mutation;
};
