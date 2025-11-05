import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof client.api.members["add-direct"]["$post"]>;
type RequestType = InferRequestType<typeof client.api.members["add-direct"]["$post"]>;

export const useAddMemberDirect = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.members["add-direct"]["$post"]({ json });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error((errorData as { error: string }).error || "Failed to add member");
      }

      return response.json();
    },
    onSuccess: (data) => {
      const successData = data as { message?: string };
      toast.success(successData.message || "Member added successfully");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return mutation;
};