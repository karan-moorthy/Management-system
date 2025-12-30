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
      router.refresh();
      queryClient.invalidateQueries();
      queryClient.removeQueries({ queryKey: ["current-user-role"] });
    },
    onError: () => {
      toast.error("Failed to log out.");
    },
  });

  return mutation;
};
