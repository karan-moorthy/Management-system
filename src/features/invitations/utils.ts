export const createInvitationLink = (inviteId: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${getBaseUrl()}/invite/${inviteId}`;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function getBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return normalizeBaseUrl(explicit);

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${normalizeBaseUrl(vercelUrl)}`;

  return "http://localhost:3000";
}