import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

export const useGetProfiles = () => {
  const query = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const response = await client.api.profiles.$get();
      
      if (!response.ok) {
        throw new Error("Failed to fetch profiles");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};
