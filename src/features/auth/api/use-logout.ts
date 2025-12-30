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
      // Set a fallback that ALWAYS redirects after 3 seconds, no matter what
      const fallbackRedirect = setTimeout(() => {
        console.warn('[Logout] Fallback redirect triggered');
        try {
          queryClient.clear();
          localStorage.clear();
          sessionStorage.clear();
        } catch (e) {
          console.error('[Logout] Fallback cache clear error:', e);
        }
        window.location.replace("/sign-in");
      }, 3000);

      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
        
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          credentials: 'include',
        });
        
        clearTimeout(timeoutId);
        clearTimeout(fallbackRedirect); // Cancel fallback if request succeeds
        
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
        clearTimeout(fallbackRedirect); // Cancel fallback, let onSuccess/onError handle it
        
        // If timeout or network error, still proceed with logout
        if (error.name === 'AbortError') {
          console.warn('[Logout] Request timeout - proceeding with local logout');
          return { success: true, message: 'Logged out (timeout)' };
        }
        throw error;
      }
    },
    onSuccess: () => {
      console.log('[Logout] Success - redirecting to sign-in');
      
      // Clear all cached data immediately
      try {
        queryClient.clear();
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error('[Logout] Cache clear error:', e);
      }
      
      // Use replace to avoid adding to history and redirect immediately
      window.location.replace("/sign-in");
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
      
      // Force redirect even on error (no toast to avoid blocking)
      window.location.replace("/sign-in");
    },
  });

  return mutation;
};
