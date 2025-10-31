import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/rpc";

interface useGetInvitationInfoProps {
  inviteId: string;
}

export const useGetInvitationInfo = ({ inviteId }: useGetInvitationInfoProps) => {
  const query = useQuery({
    queryKey: ["invitation", inviteId],
    queryFn: async () => {
      const response = await client.api.invitations[":inviteId"].$get({
        param: { inviteId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch invitation info.");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!inviteId,
  });

  return query;
};