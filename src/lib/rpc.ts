import { hc } from "hono/client";

import { AppType } from "@/app/api/[[...route]]/route";

function normalizeBaseUrl(url: string): string {
	return url.replace(/\/$/, "");
}

function getBaseUrl(): string {
	const explicit = process.env.NEXT_PUBLIC_APP_URL;
	if (explicit) return normalizeBaseUrl(explicit);

	const vercelUrl = process.env.VERCEL_URL;
	if (vercelUrl) return `https://${normalizeBaseUrl(vercelUrl)}`;

	if (typeof window !== "undefined") {
		return "";
	}

	return "http://localhost:3000";
}

export const client = hc<AppType>(getBaseUrl());
