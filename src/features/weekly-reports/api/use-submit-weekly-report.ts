import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof client.api["weekly-reports"]["$post"]>;
type RequestType = InferRequestType<typeof client.api["weekly-reports"]["$post"]>;

export const useSubmitWeeklyReport = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api["weekly-reports"].$post({ json });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error((errorData as { error: string }).error || "Failed to submit report");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success("Weekly report submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] });
      queryClient.invalidateQueries({ queryKey: ["my-reports"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit weekly report");
    },
  });

  return mutation;
};
