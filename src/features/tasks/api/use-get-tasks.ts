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
  limit = 50,  // Optimized for performance
  offset = 0,
}: UseGetTasksProps) => {
  const query = useQuery({
    queryKey: ["tasks", workspaceId, projectId, status, assigneeId, dueDate, search, month, week, limit, offset],
    queryFn: async () => {
      const startTime = performance.now();
      
      // Build query object, only including defined values
      // Optimized: Use reasonable default limit for better performance
      const queryParams: Record<string, string> = {
        limit: limit?.toString() ?? "500", // Reduced from 2000 for better initial load
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
    staleTime: 30 * 1000,           // 30 seconds - shorter for better data freshness
    gcTime: 10 * 60 * 1000,         // 10 minutes - keep in cache longer
    refetchOnWindowFocus: true,     // Refetch when window gains focus
    refetchOnMount: true,            // Refetch when component mounts
    retry: 2,                        // Retry failed requests twice
    retryDelay: 1000,              // Wait 1 second between retries
  });

  return query;
};
