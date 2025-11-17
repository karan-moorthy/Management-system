import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

export const useGetDesignations = () => {
  const query = useQuery({
    queryKey: ["designations"],
    queryFn: async () => {
      const response = await client.api.profiles.designations.$get();
      
      if (!response.ok) {
        throw new Error("Failed to fetch designations");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};
