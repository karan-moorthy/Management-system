import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface BulkUploadProfilesProps {
  file: File;
}

export const useBulkUploadProfiles = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ file }: BulkUploadProfilesProps) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profiles/bulk-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        // Throw error object with details
        const errorObj: any = new Error(error.error || "Failed to upload profiles");
        errorObj.details = error.details;
        throw errorObj;
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Successfully created ${data.count} profile(s)`);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (error: any) => {
      // Show main error
      toast.error(error.message || "Failed to upload profiles");
      
      // Show detailed errors if available
      if (error.details && Array.isArray(error.details)) {
        error.details.slice(0, 5).forEach((detail: string) => {
          toast.error(detail, { duration: 8000 });
        });
        
        if (error.details.length > 5) {
          toast.info(`...and ${error.details.length - 5} more errors. Check console for full list.`);
          console.error("All validation errors:", error.details);
        }
      }
    },
  });

  return mutation;
};
