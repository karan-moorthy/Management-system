import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

// Send client invitation
export const useSendClientInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: {
      email: string;
      projectId: string;
      workspaceId: string;
    }) => {
      const response = await client.api.clients.invite.$post({ json });

      if (!response.ok) {
        try {
          const error = await response.json() as { error?: string };
          throw new Error(error.error || `Failed to send invitation (${response.status})`);
        } catch (e) {
          if (e instanceof Error && e.message.includes("Failed to send invitation")) {
            throw e; // Re-throw if it's our custom error
          }
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      toast.success("Client invitation sent successfully");
      queryClient.invalidateQueries({ queryKey: ["client-invitations", variables.projectId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Get invitations for a project
export const useGetClientInvitations = (projectId: string) => {
  return useQuery({
    queryKey: ["client-invitations", projectId],
    queryFn: async () => {
      const response = await client.api.clients.project[":projectId"].$get({
        param: { projectId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch invitations");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!projectId,
  });
};

// Verify invitation token
export const useVerifyClientInvitation = (token: string) => {
  return useQuery({
    queryKey: ["verify-client-invitation", token],
    queryFn: async () => {
      const response = await client.api.clients.verify[":token"].$get({
        param: { token },
      });

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error || "Invalid invitation");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!token,
    retry: false,
  });
};

// Accept client invitation
export const useAcceptClientInvitation = () => {
  return useMutation({
    mutationFn: async (json: {
      token: string;
      name: string;
      password: string;
    }) => {
      const response = await client.api.clients.accept.$post({ json });

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error || "Failed to accept invitation");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("Account created successfully! Redirecting...");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

// Revoke client invitation
export const useRevokeClientInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invitationId, projectId }: { invitationId: string; projectId: string }) => {
      const response = await client.api.clients[":invitationId"].$delete({
        param: { invitationId },
      });

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error || "Failed to revoke invitation");
      }

      return { projectId };
    },
    onSuccess: (data) => {
      toast.success("Invitation revoked successfully");
      queryClient.invalidateQueries({ queryKey: ["client-invitations", data.projectId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
