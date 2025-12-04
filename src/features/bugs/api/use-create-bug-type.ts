import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.bugs.types.$post, 200>;
type RequestType = InferRequestType<typeof client.api.bugs.types.$post>;

export const useCreateBugType = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.bugs.types.$post({ json });

      if (!response.ok) {
        throw new Error("Failed to create bug type");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Bug type created successfully");
      queryClient.invalidateQueries({ queryKey: ["bug-types"] });
    },
    onError: () => {
      toast.error("Failed to create bug type");
    },
  });

  return mutation;
};
