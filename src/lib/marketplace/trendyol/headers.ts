import { randomUUID } from "node:crypto";

export type TrendyolHeaderCreds = {
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  integrationCompany?: string;
};

/** Trendyol: alfanumerik, max 30 karakter — örn. SelfIntegration */
export function sanitizeTrendyolIntegrationName(name: string | undefined): string {
  const s = (name ?? "SelfIntegration").replace(/[^a-zA-Z0-9]/g, "").slice(0, 30);
  return s || "SelfIntegration";
}

/** Zorunlu format: {sellerId} - {EntegrasyonFirmaAdi} */
export function trendyolUserAgent(creds: TrendyolHeaderCreds): string {
  return `${creds.sellerId} - ${sanitizeTrendyolIntegrationName(creds.integrationCompany)}`;
}

export function trendyolAuthHeaders(
  creds: TrendyolHeaderCreds,
  extra?: Record<string, string>,
): Record<string, string> {
  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
  const agent = sanitizeTrendyolIntegrationName(creds.integrationCompany);
  return {
    Authorization: `Basic ${auth}`,
    "Content-Type": "application/json",
    "User-Agent": trendyolUserAgent(creds),
    "x-correlationid": randomUUID(),
    "x-agentname": agent,
    ...extra,
  };
}
