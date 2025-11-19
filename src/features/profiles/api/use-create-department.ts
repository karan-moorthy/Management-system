import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (json: { name: string }) => {
      const response = await client.api.profiles.departments.$post({ json });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as any;
        throw new Error(errorData.error || "Failed to create department");
      }

      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      toast.success("Department created successfully");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create department");
    },
  });

  return mutation;
};
