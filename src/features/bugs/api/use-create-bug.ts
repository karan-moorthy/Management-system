import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.bugs.$post, 200>;
type RequestType = InferRequestType<typeof client.api.bugs.$post>;

export const useCreateBug = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.bugs.$post({ json });

      if (!response.ok) {
        throw new Error("Failed to create bug");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Bug created successfully");
      queryClient.invalidateQueries({ queryKey: ["bugs"] });
    },
    onError: () => {
      toast.error("Failed to create bug");
    },
  });

  return mutation;
};
