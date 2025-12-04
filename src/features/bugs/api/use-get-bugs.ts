import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

export const useGetBugs = () => {
  return useQuery({
    queryKey: ["bugs"],
    queryFn: async () => {
      const response = await client.api.bugs.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch bugs");
      }

      const { data } = await response.json();
      return data;
    },
  });
};

export const useGetAssignedBugs = () => {
  return useQuery({
    queryKey: ["bugs", "assigned"],
    queryFn: async () => {
      const response = await client.api.bugs.assigned.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch assigned bugs");
      }

      const { data } = await response.json();
      return data;
    },
  });
};

export const useGetReportedBugs = () => {
  return useQuery({
    queryKey: ["bugs", "reported"],
    queryFn: async () => {
      const response = await client.api.bugs.reported.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch reported bugs");
      }

      const { data } = await response.json();
      return data;
    },
  });
};
