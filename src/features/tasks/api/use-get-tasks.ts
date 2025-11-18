import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/rpc";

import { TaskStatus } from "../types";

interface UseGetTasksProps {
  workspaceId?: string;
  projectId?: string | null;
  status?: TaskStatus | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}

export const useGetTasks = ({
  workspaceId,
  projectId,
  status,
  assigneeId,
  dueDate,
  search,
  limit = 500, // Default to 500 to handle large datasets
  offset = 0,
}: UseGetTasksProps) => {
  const query = useQuery({
    queryKey: [
      "tasks",
      workspaceId,
      projectId,
      status,
      assigneeId,
      dueDate,
      search,
      limit,
      offset,
    ],
    queryFn: async () => {
      const response = await client.api.tasks.$get({
        query: {
          workspaceId: workspaceId ?? undefined,
          projectId: projectId ?? undefined,
          status: status ?? undefined,
          assigneeId: assigneeId ?? undefined,
          dueDate: dueDate ?? undefined,
          search: search ?? undefined,
          limit: limit?.toString(),
          offset: offset?.toString(),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tasks.");
      }

      const { data } = await response.json();

      return data;
    },
    staleTime: 0, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Refetch on component mount
  });

  return query;
};
