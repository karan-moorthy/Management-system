export const createInvitationLink = (inviteId: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/invite/${inviteId}`;
};