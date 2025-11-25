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
  month?: string | null;
  week?: string | null;
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
  month,
  week,
  limit = 2000,  // Increased to support showing all tasks
  offset = 0,
}: UseGetTasksProps) => {
  const query = useQuery({
    queryKey: ["tasks", workspaceId, projectId, status, assigneeId, dueDate, search, month, week, limit, offset],
    queryFn: async () => {
      const startTime = performance.now();
      
      // Build query object, only including defined values
      const queryParams: Record<string, string> = {
        limit: limit?.toString() ?? "2000",
        offset: offset?.toString() ?? "0",
      };
      
      // Only add parameters if they have actual values
      if (workspaceId) queryParams.workspaceId = workspaceId;
      if (projectId) queryParams.projectId = projectId;
      if (status) queryParams.status = status;
      if (assigneeId) queryParams.assigneeId = assigneeId;
      if (dueDate) queryParams.dueDate = dueDate;
      if (search) queryParams.search = search;
      if (month) queryParams.month = month;
      if (week) queryParams.week = week;
      
      const response = await client.api.tasks.$get({
        query: queryParams as any,
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
    staleTime: 30 * 1000,          // 30 seconds - shorter for fresher data
    gcTime: 5 * 60 * 1000,         // 5 minutes - keep in cache
    refetchOnWindowFocus: false,    // Don't refetch on focus
    refetchOnMount: true,           // Refetch on mount if stale
    retry: 2,                       // Retry failed requests twice
    retryDelay: 1000,              // Wait 1 second between retries
  });

  return query;
};
