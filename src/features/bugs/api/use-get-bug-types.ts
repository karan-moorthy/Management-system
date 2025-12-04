import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

export const useGetBugTypes = () => {
  return useQuery({
    queryKey: ["bug-types"],
    queryFn: async () => {
      const response = await client.api.bugs.types.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch bug types");
      }

      const { data } = await response.json();
      return data;
    },
  });
};
