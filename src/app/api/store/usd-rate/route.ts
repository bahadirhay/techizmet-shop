import { NextResponse } from "next/server";
import { getDefaultSite } from "@/lib/site";
import { getSiteSettings } from "@/lib/site-settings";
import { getEffectiveUsdTryRate } from "@/lib/currency/exchange-rate";

export const revalidate = 3600; // 1 saat

export async function GET() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const markupPercent = settings.store?.usdMarkupPercent ?? 0;
  const rate = await getEffectiveUsdTryRate(markupPercent);
  return NextResponse.json(
    { rate, markupPercent },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
      },
    },
  );
}
