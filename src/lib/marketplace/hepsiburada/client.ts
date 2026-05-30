export type HepsiburadaOmsCredentials = {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  omsBaseUrl: string;
};

export function parseHepsiburadaOmsConfig(config: Record<string, string>): HepsiburadaOmsCredentials | null {
  const merchantId = config.sellerId?.trim() || config.merchantId?.trim();
  const apiKey = config.apiKey?.trim();
  const apiSecret = config.apiSecret?.trim() || config.secretKey?.trim();
  if (!merchantId || !apiKey || !apiSecret) return null;

  const stage = config.testMode === "true";
  const omsBaseUrl =
    config.hepsiburadaOmsBaseUrl?.trim() ||
    (stage ? "https://oms-external-sit.hepsiburada.com" : "https://oms-external.hepsiburada.com");

  return { merchantId, apiKey, apiSecret, omsBaseUrl };
}

export async function hepsiburadaOmsRequest(
  creds: HepsiburadaOmsCredentials,
  path: string,
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
  const url = `${creds.omsBaseUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "User-Agent": `${creds.merchantId} - TechizmetShop`,
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

export function formatHbOmsDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
