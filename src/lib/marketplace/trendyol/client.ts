import { trendyolAuthHeaders } from "@/lib/marketplace/trendyol/headers";

export type TrendyolCredentials = {
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  stage: boolean;
  /** User-Agent ikinci kısım — kendi yazılım: SelfIntegration */
  integrationCompany?: string;
};

export function parseTrendyolConfig(config: Record<string, string>): TrendyolCredentials | null {
  const sellerId = (config.sellerId?.trim() || config.supplierId?.trim() || "").replace(/\s/g, "");
  const apiKey = config.apiKey?.trim();
  const apiSecret = config.apiSecret?.trim() || config.secretKey?.trim();
  if (!sellerId || !apiKey || !apiSecret) return null;
  const stage = config.useStage === "true" || config.testMode === "true";
  const integrationCompany =
    config.integrationCompany?.trim() ||
    config.userAgentCompany?.trim() ||
    "SelfIntegration";
  return { sellerId, apiKey, apiSecret, stage, integrationCompany };
}

export function trendyolApiBase(creds: TrendyolCredentials): string {
  return creds.stage
    ? "https://stageapigw.trendyol.com"
    : "https://apigw.trendyol.com";
}

export function trendyolLegacyProductBase(creds: TrendyolCredentials): string {
  return creds.stage
    ? "https://stageapi.trendyol.com"
    : "https://api.trendyol.com";
}

export async function trendyolRequest(
  creds: TrendyolCredentials,
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; text: string; json: unknown }> {
  const url = `${trendyolApiBase(creds)}${path}`;
  const baseHeaders = trendyolAuthHeaders(creds);
  const res = await fetch(url, {
    ...init,
    headers: {
      ...baseHeaders,
      ...(init.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : (init.headers as Record<string, string> | undefined)),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, text, json };
}
