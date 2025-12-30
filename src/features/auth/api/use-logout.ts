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
      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          credentials: 'include',
        });
        
        clearTimeout(timeoutId);
        
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
      } catch (error: any) {
        // If timeout or network error, still proceed with logout
        if (error.name === 'AbortError') {
          console.warn('[Logout] Request timeout - proceeding with local logout');
        }
        // Don't throw on timeout - let it proceed to onSuccess
        if (error.name === 'AbortError') {
          return { success: true, message: 'Logged out (timeout)' };
        }
        throw error;
      }
    },
    onSuccess: () => {
      console.log('[Logout] Success - redirecting to sign-in');
      toast.success("Logged out.");
      
      // Clear all cached data immediately
      try {
        queryClient.clear();
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error('[Logout] Cache clear error:', e);
      }
      
      // Force hard redirect to sign-in page
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 100);
    },
    onError: (error) => {
      console.error('[Logout Error]:', error);
      
      // Even on error, clear local data and redirect
      try {
        queryClient.clear();
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error('[Logout] Cache clear error:', e);
      }
      
      toast.error("Logging out...");
      
      // Force redirect even on error
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 500);
    },
  });

  return mutation;
};
