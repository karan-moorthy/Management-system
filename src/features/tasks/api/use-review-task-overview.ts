import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { client } from "@/lib/rpc";
import { ReviewTaskOverviewPayload } from "../types";

export const useReviewTaskOverview = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: ReviewTaskOverviewPayload) => {
      const response = await client.api["task-overviews"][":overviewId"]["review"].$patch({
        param: { overviewId: payload.overviewId },
        json: {
          status: payload.status,
          adminRemarks: payload.adminRemarks,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error as any).message || "Failed to review task overview");
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      const isApproved = variables.status === "APPROVED";
      toast.success(
        isApproved
          ? "Task approved and moved to Done!"
          : "Rework requested. Task moved back to In Progress."
      );
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-overviews"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to review task overview");
    },
  });

  return mutation;
};
