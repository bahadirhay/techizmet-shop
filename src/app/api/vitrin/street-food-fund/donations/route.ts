import { NextResponse } from "next/server";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { listPublishedStreetFoodDonations } from "@/lib/street-food-fund/donations";
import { getStreetFoodFundSettings } from "@/lib/street-food-fund/settings";
import { getDefaultSite } from "@/lib/site";
import { getSiteSettings } from "@/lib/site-settings";
import { ensureStoreTenant } from "@/lib/store-tenant";

export const dynamic = "force-dynamic";

/** Vitrin — sokak dostları bağış günlüğü */
export async function GET() {
  await ensureStoreTenant();
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const cfg = getStreetFoodFundSettings(settings);
  if (!cfg.enabled) {
    return NextResponse.json({ donations: [] }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  const locale = await getStoreLocaleFromHeaders();
  const donations = await listPublishedStreetFoodDonations(
    site.id,
    locale === "en" ? "en" : "tr",
  );

  return NextResponse.json({ donations }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
