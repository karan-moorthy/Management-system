import { toast } from "sonner";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/rpc";
import { useRouter } from "next/navigation";

type ResponseType = InferResponseType<(typeof client.api.auth.logout)["$post"]>;

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error>({
    mutationFn: async () => {
      const response = await client.api.auth.logout.$post();
      
      // Defensive JSON parsing
      if (!response.ok) {
        let errorMsg = 'Failed to log out';
        try {
          const error = await response.json() as any;
          errorMsg = error?.error || error?.message || errorMsg;
        } catch {
          // If JSON parsing fails, use default message
        }
        throw new Error(errorMsg);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast.success("Logged out.");
      queryClient.invalidateQueries();
      queryClient.removeQueries({ queryKey: ["current-user-role"] });
      queryClient.clear(); // Clear all cached data
      
      // Force redirect to sign-in page
      window.location.href = "/sign-in";
    },
    onError: (error) => {
      console.error('[Logout Error]:', error);
      toast.error(error.message || "Failed to log out.");
      
      // Even if logout fails, redirect to sign-in
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 1500);
    },
  });

  return mutation;
};
