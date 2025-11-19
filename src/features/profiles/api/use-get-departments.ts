import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

export const useGetDepartments = () => {
  const query = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const response = await client.api.profiles.departments.$get();
      
      if (!response.ok) {
        throw new Error("Failed to fetch departments");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};
