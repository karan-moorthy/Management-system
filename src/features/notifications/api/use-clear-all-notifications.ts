import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/rpc";

export const useClearAllNotifications = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await client.api.notifications["clear-all"].$delete();

      if (!response.ok) {
        throw new Error("Failed to clear notifications");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("All notifications cleared");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Failed to clear notifications");
    },
  });

  return mutation;
};
