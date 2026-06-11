import "server-only";

import { getGscAccessToken, parseGscServiceAccountFromEnv } from "@/lib/admin/gsc/auth";

export type GscQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscFetchParams = {
  property: string;
  startDate: string;
  endDate: string;
  rowLimit?: number;
};

function encodeSiteUrl(property: string): string {
  return encodeURIComponent(property.trim());
}

export async function fetchGscSearchQueries(params: GscFetchParams): Promise<GscQueryRow[]> {
  const account = parseGscServiceAccountFromEnv();
  if (!account) {
    throw new Error(
      "GSC kimlik bilgisi yok — .env dosyasına GSC_SERVICE_ACCOUNT_JSON veya GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY ekleyin",
    );
  }

  const token = await getGscAccessToken(account);
  const siteUrl = encodeSiteUrl(params.property);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${siteUrl}/searchAnalytics/query`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: ["query"],
      rowLimit: Math.min(1000, Math.max(1, params.rowLimit ?? 250)),
      startRow: 0,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `GSC API hatası (${res.status})${text ? `: ${text.slice(0, 300)}` : ""}. Servis hesabının Search Console'da ${params.property} için en az Tam kullanıcı olarak eklendiğinden emin olun.`,
    );
  }

  const data = (await res.json()) as {
    rows?: { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }[];
  };

  return (data.rows ?? []).map((row) => ({
    query: String(row.keys?.[0] ?? "").trim(),
    clicks: Number(row.clicks) || 0,
    impressions: Number(row.impressions) || 0,
    ctr: Number(row.ctr) || 0,
    position: Number(row.position) || 0,
  }));
}

export function formatGscDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function gscDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  end.setDate(end.getDate() - 2);
  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(1, days) + 1);
  return { startDate: formatGscDate(start), endDate: formatGscDate(end) };
}
