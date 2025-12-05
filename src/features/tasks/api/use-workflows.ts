import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

// Get workflows for workspace
export const useGetWorkflows = (workspaceId: string) => {
  return useQuery({
    queryKey: ["workflows", workspaceId],
    queryFn: async () => {
      const response = await client.api.tasks["custom-fields"].workflows.$get({
        query: { workspaceId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch workflows");
      }

      const result = await response.json() as { data: any };
      return result.data;
    },
    enabled: !!workspaceId,
  });
};

// Get default workflow for workspace
export const useGetDefaultWorkflow = (workspaceId: string) => {
  return useQuery({
    queryKey: ["workflows", "default", workspaceId],
    queryFn: async () => {
      const response = await client.api.tasks["custom-fields"].workflows.$get({
        query: { workspaceId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch default workflow");
      }

      const result = await response.json() as { data: any };
      return result.data;
    },
    enabled: !!workspaceId,
  });
};

// Create workflow
export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      workspaceId: string;
      name: string;
      description?: string;
      statuses: Array<{
        key: string;
        name: string;
        category: "TODO" | "IN_PROGRESS" | "DONE";
        color?: string;
      }>;
      transitions?: Array<{
        id: string;
        name: string;
        from: string;
        to: string;
        rules?: any;
      }>;
      isDefault?: boolean;
    }) => {
      const response = await client.api.tasks["custom-fields"].workflows.$post({
        json: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to create workflow");
      }

      const result = await response.json() as { data: any };
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflows", variables.workspaceId],
      });
    },
  });
};

// Update workflow
export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      workspaceId,
      ...payload
    }: {
      id: string;
      workspaceId: string;
      name?: string;
      description?: string;
      statuses?: Array<{
        key: string;
        name: string;
        category: "TODO" | "IN_PROGRESS" | "DONE";
        color?: string;
      }>;
      transitions?: Array<{
        id: string;
        name: string;
        from: string;
        to: string;
        rules?: any;
      }>;
      isDefault?: boolean;
    }) => {
      const response = await (client.api.tasks["custom-fields"].workflows as any)[":id"].$patch({
        param: { id },
        json: payload,
      });

      if (!response.ok) {
        throw new Error("Failed to update workflow");
      }

      const result = await response.json() as { data: any };
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflows", variables.workspaceId],
      });
    },
  });
};

// Add status to workflow
export const useAddStatusToWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      workspaceId,
      status,
    }: {
      workflowId: string;
      workspaceId: string;
      status: {
        key: string;
        name: string;
        category: "TODO" | "IN_PROGRESS" | "DONE";
        color?: string;
      };
    }) => {
      const response = await (client.api.tasks["custom-fields"].workflows as any)[":id"].statuses.$post({
        param: { id: workflowId },
        json: { status },
      });

      if (!response.ok) {
        throw new Error("Failed to add status to workflow");
      }

      const result = await response.json() as { data: any };
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflows", variables.workspaceId],
      });
    },
  });
};
