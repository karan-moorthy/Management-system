import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

// Types
export type ListViewColumn = {
  id: string;
  workspaceId: string;
  fieldName: string;
  displayName: string;
  columnType: 'text' | 'select' | 'user' | 'date' | 'labels' | 'priority';
  width: number;
  position: number;
  isVisible: boolean;
  isSortable: boolean;
  isFilterable: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

// Get all columns for a workspace
export const useGetListViewColumns = (workspaceId: string) => {
  return useQuery({
    queryKey: ["list-view-columns", workspaceId],
    queryFn: async () => {
      // @ts-ignore - TypeScript has issues with bracket notation in nested routes
      const response = await client.api.tasks["list-view"].columns.$get({
        query: { workspaceId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch list view columns");
      }

      const { data } = await response.json();
      return data as ListViewColumn[];
    },
    enabled: !!workspaceId,
  });
};

// Create a new column
export const useCreateListViewColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: {
      workspaceId: string;
      fieldName: string;
      displayName: string;
      columnType: 'text' | 'select' | 'user' | 'date' | 'labels' | 'priority';
      width?: number;
      position?: number;
      isVisible?: boolean;
      isSortable?: boolean;
      isFilterable?: boolean;
    }) => {
      // @ts-ignore - TypeScript has issues with bracket notation in nested routes
      const response = await client.api.tasks["list-view"].columns.$post({ json });

      if (!response.ok) {
        throw new Error("Failed to create column");
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["list-view-columns", variables.workspaceId] 
      });
    },
  });
};

// Update a column
export const useUpdateListViewColumn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, workspaceId, updates }: { 
      id: string; 
      workspaceId: string; 
      updates: {
        displayName?: string;
        width?: number;
        position?: number;
        isVisible?: boolean;
      }
    }) => {
      // @ts-ignore - TypeScript has issues with bracket notation in nested routes
      const response = await client.api.tasks["list-view"].columns[":id"].$patch({
        param: { id },
        json: updates,
      });

      if (!response.ok) {
        throw new Error("Failed to update column");
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["list-view-columns", variables.workspaceId] 
      });
    },
  });
};

// Reorder columns
export const useReorderListViewColumns = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId, columns }: { 
      workspaceId: string; 
      columns: { id: string; position: number; }[]
    }) => {
      // @ts-ignore - TypeScript has issues with bracket notation in nested routes
      const response = await client.api.tasks["list-view"].columns.reorder.$post({
        json: { columns },
      });

      if (!response.ok) {
        throw new Error("Failed to reorder columns");
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["list-view-columns", variables.workspaceId] 
      });
    },
  });
};

// Delete a column
export const useDeleteListViewColumn = () => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, { id: string; workspaceId: string }>({
    mutationFn: async ({ id }) => {
      // @ts-ignore - TypeScript has issues with bracket notation in nested routes
      const response = await client.api.tasks["list-view"].columns[":id"].$delete({
        param: { id },
      });

      if (!response.ok) {
        throw new Error("Failed to delete column");
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["list-view-columns", variables.workspaceId] 
      });
    },
  });
};
