import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/rpc';

interface UseGetWeeklyReportsProps {
  department?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}

export const useGetWeeklyReports = ({
  department,
  userId,
  fromDate,
  toDate,
}: UseGetWeeklyReportsProps = {}) => {
  const query = useQuery({
    queryKey: ['weekly-reports', { department, userId, fromDate, toDate }],
    queryFn: async () => {
      const response = await client.api['weekly-reports'].$get({
        query: {
          department: department || undefined,
          userId: userId || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weekly reports');
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};

export const useGetMyReports = () => {
  const query = useQuery({
    queryKey: ['my-reports'],
    queryFn: async () => {
      const response = await client.api['weekly-reports']['my-reports'].$get();

      if (!response.ok) {
        throw new Error('Failed to fetch your reports');
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};

export const useGetWeeklyReport = (reportId: string) => {
  const query = useQuery({
    queryKey: ['weekly-report', reportId],
    queryFn: async () => {
      const response = await client.api['weekly-reports'][':id'].$get({
        param: { id: reportId },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!reportId,
  });

  return query;
};
