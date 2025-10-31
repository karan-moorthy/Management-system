import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<
  (typeof client.api.invitations)[":inviteId"]["accept"]["$post"], 
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.invitations)[":inviteId"]["accept"]["$post"]
>;

export const useAcceptInvite = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const response = await client.api.invitations[":inviteId"]["accept"].$post({ param });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = (errorData as any).error || "Failed to accept invitation.";
        throw new Error(errorMessage);
      }

      return await response.json();
    },
    onSuccess: ({ data }) => {
      toast.success("Successfully joined workspace!");
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["workspace", data.$id] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to accept invitation.");
    },
  });

  return mutation;
};
