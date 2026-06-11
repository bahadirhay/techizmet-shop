/**
 * USD/TRY döviz kuru — TCMB XML (resmi, ücretsiz, kayıt gerektirmez)
 * Yedek: open.er-api.com (ücretsiz, günlük 1500 istek)
 * 1 saatlik Next.js önbellek
 */
import { unstable_cache } from "next/cache";

const CACHE_TAG = "usd-try-rate";

async function fetchRateFromTCMB(): Promise<number | null> {
  try {
    const res = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const xml = await res.text();
    const match = xml.match(
      /<Currency[^>]*CurrencyCode="USD"[^>]*>[\s\S]*?<ForexSelling>([\d,.]+)<\/ForexSelling>/i,
    );
    if (!match?.[1]) return null;
    const rate = parseFloat(match[1].replace(",", "."));
    return Number.isFinite(rate) && rate > 1 ? rate : null;
  } catch {
    return null;
  }
}

async function fetchRateFromFallback(): Promise<number | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: { TRY?: number } };
    const rate = data?.rates?.TRY;
    return typeof rate === "number" && rate > 1 ? rate : null;
  } catch {
    return null;
  }
}

/** Piyasa USD/TRY kuru — 1 saatlik önbellekle */
export const getMarketUsdTryRate = unstable_cache(
  async (): Promise<number | null> => {
    const rate = await fetchRateFromTCMB();
    if (rate) return rate;
    return fetchRateFromFallback();
  },
  ["market-usd-try-rate"],
  { revalidate: 3600, tags: [CACHE_TAG] },
);

/**
 * Markup uygulanmış USD/TRY kuru
 * @param markupPercent — örn. 5 = piyasanın %5 üstü (varsayılan 0)
 */
export async function getEffectiveUsdTryRate(markupPercent = 0): Promise<number | null> {
  const market = await getMarketUsdTryRate();
  if (!market) return null;
  const multiplier = 1 + Math.max(0, markupPercent) / 100;
  return Math.round(market * multiplier * 100) / 100; // 2 ondalık
}
