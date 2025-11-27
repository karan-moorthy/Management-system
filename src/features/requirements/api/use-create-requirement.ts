import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

export const useCreateRequirement = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (json: {
      tentativeTitle: string;
      customer: string;
      projectManagerId: string;
      projectDescription?: string;
      dueDate?: string;
      sampleInputFiles?: Array<{ name: string; content: string }>;
      expectedOutputFiles?: Array<{ name: string; content: string }>;
    }) => {
      const response = await client.api.requirements.$post({ json });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as any;
        throw new Error(errorData.error || "Failed to create requirement");
      }

      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      toast.success("Requirement created successfully");
      queryClient.invalidateQueries({ queryKey: ["requirements"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create requirement");
    },
  });

  return mutation;
};
