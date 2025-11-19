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
  limit = 2000,  // Increased to support showing all tasks
  offset = 0,
}: UseGetTasksProps) => {
  const query = useQuery({
    queryKey: ["tasks", workspaceId, projectId, status, assigneeId, dueDate, search, limit, offset],
    queryFn: async () => {
      const startTime = performance.now();
      
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
      
      const endTime = performance.now();
      const fetchTime = endTime - startTime;
      
      // Log performance metrics
      if (fetchTime > 1000) {
        console.warn(`⚠️ Slow task fetch: ${fetchTime.toFixed(0)}ms for ${data.documents.length} tasks`);
      } else {
        console.log(`✅ Task fetch: ${fetchTime.toFixed(0)}ms for ${data.documents.length} tasks`);
      }

      return data;
    },
    staleTime: 5 * 60 * 1000,      // 5 minutes - cache longer for better performance
    gcTime: 10 * 60 * 1000,        // 10 minutes - keep in cache longer
    refetchOnWindowFocus: false,    // Don't refetch on focus (saves API calls)
    refetchOnMount: false,          // Don't refetch if data is fresh
    retry: 2,                       // Retry failed requests twice
    retryDelay: 1000,              // Wait 1 second between retries
  });

  return query;
};
