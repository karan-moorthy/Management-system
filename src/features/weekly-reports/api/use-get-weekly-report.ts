import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/rpc';

export const useGetWeeklyReport = (id: string) => {
  const query = useQuery({
    queryKey: ['weekly-report', id],
    queryFn: async () => {
      const response = await client.api['weekly-reports'][':id'].$get({
        param: { id },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weekly report');
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!id,
  });

  return query;
};
