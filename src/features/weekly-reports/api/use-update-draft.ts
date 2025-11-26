import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof client.api["weekly-reports"][":id"]["$patch"]>;
type RequestType = InferRequestType<typeof client.api["weekly-reports"][":id"]["$patch"]>;

export const useUpdateDraft = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, json }) => {
      const response = await client.api["weekly-reports"][":id"].$patch({ param, json });
      
      if (!response.ok) {
        throw new Error("Failed to update draft");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Updated successfully");
      queryClient.invalidateQueries({ queryKey: ["my-weekly-reports"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update draft");
    },
  });

  return mutation;
};
