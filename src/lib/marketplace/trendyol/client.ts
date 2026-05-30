export type TrendyolCredentials = {
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  stage: boolean;
};

export function parseTrendyolConfig(config: Record<string, string>): TrendyolCredentials | null {
  const sellerId = config.sellerId?.trim() || config.supplierId?.trim();
  const apiKey = config.apiKey?.trim();
  const apiSecret = config.apiSecret?.trim() || config.secretKey?.trim();
  if (!sellerId || !apiKey || !apiSecret) return null;
  const stage = config.useStage === "true" || config.testMode === "true";
  return { sellerId, apiKey, apiSecret, stage };
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
  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
  const url = `${trendyolApiBase(creds)}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      "User-Agent": `${creds.sellerId} - TechizmetShop`,
      ...(init.headers ?? {}),
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
