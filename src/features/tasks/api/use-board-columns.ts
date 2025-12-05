import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

export type BoardColumn = {
  id: string;
  workspaceId: string;
  name: string;
  position: number;
  color: string;
  category: "TODO" | "IN_PROGRESS" | "DONE";
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

// Get board columns for workspace
export const useGetBoardColumns = (workspaceId: string) => {
  return useQuery({
    queryKey: ["board-columns", workspaceId],
    queryFn: async () => {
      const response = await client.api.tasks["custom-fields"]["board-columns"].$get({
        query: { workspaceId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch board columns");
      }

      const result = await response.json() as { data: BoardColumn[] };
      return result.data;
    },
    enabled: !!workspaceId,
  });
};

// Create board column
export const useCreateBoardColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      workspaceId: string;
      name: string;
      position?: number;
      color?: string;
      category: "TODO" | "IN_PROGRESS" | "DONE";
    }) => {
      const response = await client.api.tasks["custom-fields"]["board-columns"].$post({
        json: data,
      });
      
      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create column (${response.status})`);
      }

      const result = await response.json() as { data: BoardColumn };
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["board-columns", variables.workspaceId] });
      toast.success("Column created successfully");
    },
    onError: (error) => {
      console.error("Create column mutation error:", error);
      toast.error(error.message || "Failed to create column");
    },
  });
};

// Update board column
export const useUpdateBoardColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      workspaceId,
      ...data
    }: {
      id: string;
      workspaceId: string;
      name?: string;
      position?: number;
      color?: string;
      category?: "TODO" | "IN_PROGRESS" | "DONE";
    }) => {
      const response = await (client.api.tasks["custom-fields"]["board-columns"] as any)[":id"].$patch({
        param: { id },
        json: data,
      });

      if (!response.ok) {
        throw new Error("Failed to update column");
      }

      const result = await response.json() as { data: BoardColumn };
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["board-columns", variables.workspaceId] });
      toast.success("Column updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update column");
    },
  });
};

// Delete board column
export const useDeleteBoardColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const response = await (client.api.tasks["custom-fields"]["board-columns"] as any)[":id"].$delete({
        param: { id },
      });

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        throw new Error(error.error || "Failed to delete column");
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["board-columns", variables.workspaceId] });
      toast.success("Column deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete column");
    },
  });
};
