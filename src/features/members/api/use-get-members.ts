import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/rpc";

interface useGetMembersProps {
  workspaceId?: string;
  forTaskAssignment?: boolean; // New flag to get all users for task assignment
}

export const useGetMembers = ({ workspaceId, forTaskAssignment }: useGetMembersProps = {}) => {
  const query = useQuery({
    queryKey: ["members", workspaceId, forTaskAssignment],
    queryFn: async () => {
      const queryParams: Record<string, string> = {};
      
      if (workspaceId) {
        queryParams.workspaceId = workspaceId;
      }
      
      if (forTaskAssignment) {
        queryParams.forTaskAssignment = "true";
      }
      
      const response = await client.api.members.$get({
        query: queryParams,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch members.");
      }

      const { data } = await response.json();

      return data;
    },
  });

  return query;
};
