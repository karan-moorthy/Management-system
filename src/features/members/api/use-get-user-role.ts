import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

/**
 * Get current user's role in ANY workspace (checks first workspace found)
 * Used for global permission checks when no specific workspace context
 */
export const useGetCurrentUserRole = () => {
  const query = useQuery({
    queryKey: ["current-user-role"],
    queryFn: async () => {
      const response = await client.api.members["role"].$get();

      // If unauthorized, return null instead of throwing
      // This is expected when user is not logged in
      if (response.status === 401) {
        return { role: null, workspaceId: null };
      }

      if (!response.ok) {
        throw new Error("Failed to fetch user role");
      }

      const { data } = await response.json();
      return data;
    },
    retry: false, // Don't retry 401 errors
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to prevent refetching
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false, // Don't refetch on component mount if data exists
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  return query;
};

/**
 * Check if current user is admin (without workspace context)
 * Useful for global UI elements like sidebar
 */
export const useIsGlobalAdmin = () => {
  const { data: roleData, isLoading } = useGetCurrentUserRole();
  
  const isAdmin = roleData && (
    roleData.role === "ADMIN" || 
    roleData.role === "PROJECT_MANAGER" ||
    roleData.role === "MANAGEMENT"
  );

  return {
    data: isAdmin || false,
    isLoading
  };
};
