import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof client.api["weekly-reports"]["$post"]>;
type RequestType = InferRequestType<typeof client.api["weekly-reports"]["$post"]>;

export const useSaveDraft = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api["weekly-reports"].$post({ json });
      
      if (!response.ok) {
        throw new Error("Failed to save draft");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Draft saved successfully");
      queryClient.invalidateQueries({ queryKey: ["my-weekly-reports"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save draft");
    },
  });

  return mutation;
};
