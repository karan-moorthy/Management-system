import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      console.log('[Mark All Read] Starting mutation');
      const response = await client.api.notifications["mark-all-read"].$patch();

      console.log('[Mark All Read] Response status:', response.status, response.ok);

      if (!response.ok) {
        // Try to parse error as JSON, fallback to text
        let errorMessage = "Failed to mark all notifications as read";
        try {
          const errorData = await response.json() as any;
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('[Mark All Read] Error response:', errorData);
        } catch (parseError) {
          // If JSON parsing fails, try to get text
          try {
            const errorText = await response.text();
            console.error('[Mark All Read] Error text:', errorText);
            if (errorText) errorMessage = errorText;
          } catch (textError) {
            console.error('[Mark All Read] Could not parse error');
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json() as any;
      console.log('[Mark All Read] Success:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[Mark All Read] Invalidating queries');
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(data.message || "All notifications marked as read");
    },
    onError: (error: Error) => {
      console.error('[Mark All Read] Mutation error:', error);
      toast.error(error.message || "Failed to mark notifications as read");
    },
  });

  return mutation;
};
