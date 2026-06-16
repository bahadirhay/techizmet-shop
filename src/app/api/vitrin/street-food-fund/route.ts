import { NextResponse } from "next/server";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { buildStreetFoodFundPublicPayload } from "@/lib/street-food-fund/campaign";
import { getDefaultSite } from "@/lib/site";
import { ensureStoreTenant } from "@/lib/store-tenant";

export const dynamic = "force-dynamic";

/** Vitrin — sokak dostları mama fonu sayacı */
export async function GET() {
  await ensureStoreTenant();
  const site = await getDefaultSite();
  const locale = await getStoreLocaleFromHeaders();
  const payload = await buildStreetFoodFundPublicPayload(site.id, locale);
  if (!payload) {
    return NextResponse.json({ enabled: false }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
