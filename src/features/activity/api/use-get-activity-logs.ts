import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetActivityLogsProps {
  workspaceId?: string;
  taskId?: string;
  projectId?: string;
  entityType?: string;
  actionType?: string;
  limit?: number;
  offset?: number;
}

export const useGetActivityLogs = ({
  workspaceId,
  taskId,
  projectId,
  entityType,
  actionType,
  limit = 50,
  offset = 0,
}: UseGetActivityLogsProps) => {
  const query = useQuery({
    queryKey: [
      "activity-logs",
      workspaceId,
      taskId,
      projectId,
      entityType,
      actionType,
      limit,
      offset,
    ],
    queryFn: async () => {
      const startTime = performance.now();

      const response = await client.api.activity.$get({
        query: {
          workspaceId: workspaceId ?? undefined,
          taskId: taskId ?? undefined,
          projectId: projectId ?? undefined,
          entityType: entityType ?? undefined,
          actionType: actionType ?? undefined,
          limit: limit?.toString(),
          offset: offset?.toString(),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch activity logs.");
      }

      const { data } = await response.json();

      const fetchTime = performance.now() - startTime;
      console.log(
        `✅ Fetched ${data.total} activity logs in ${fetchTime.toFixed(2)}ms`
      );

      return data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return query;
};
