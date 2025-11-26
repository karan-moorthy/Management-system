import { useMutation, useQueryClient } from '@tanstack/react-query';
import { InferRequestType, InferResponseType } from 'hono';
import { toast } from 'sonner';

import { client } from '@/lib/rpc';

type ResponseType = InferResponseType<typeof client.api['weekly-reports']['$post'], 200>;
type RequestType = InferRequestType<typeof client.api['weekly-reports']['$post']>['json'];

export const useCreateWeeklyReport = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async (json) => {
      const response = await client.api['weekly-reports'].$post({ json });
      
      if (!response.ok) {
        throw new Error('Failed to create weekly report');
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success('Weekly report submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['weekly-reports'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit weekly report');
    },
  });

  return mutation;
};
