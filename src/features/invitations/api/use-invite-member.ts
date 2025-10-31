import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { client } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof client.api.invitations.$post, 200>;
type RequestType = InferRequestType<typeof client.api.invitations.$post>;

export const useInviteMember = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.invitations.$post({ json });

      if (!response.ok) {
        throw new Error("Failed to send invitation.");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Invitation sent successfully.");
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
    onError: async (error) => {
      // Try to parse the error response for a more specific message
      let errorMessage = "Failed to send invitation.";
      
      if (error.message.includes("503")) {
        errorMessage = "Database setup incomplete. Please create the invitations collection in Appwrite.";
      } else if (error.message.includes("Collection with the requested ID could not be found")) {
        errorMessage = "Database setup incomplete. Please create the invitations collection in Appwrite.";
      }
      
      toast.error(errorMessage);
    },
  });

  return mutation;
};