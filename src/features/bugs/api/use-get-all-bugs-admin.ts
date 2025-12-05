import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetAllBugsAdminOptions {
  enabled?: boolean;
}

export const useGetAllBugsAdmin = (options?: UseGetAllBugsAdminOptions) => {
  const query = useQuery({
    queryKey: ["bugs", "admin", "all"],
    queryFn: async () => {
      const response = await client.api.bugs.admin.all.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch all bugs");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: options?.enabled !== false,
  });

  return query;
};
