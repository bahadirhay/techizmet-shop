import { NextResponse } from "next/server";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { loadHomeListingProducts } from "@/lib/mirror-home-products-inject";
import { getSiteSettingsUncached } from "@/lib/site-settings-load";
import { getDefaultSite } from "@/lib/site";
import { resolveMirrorCollectionTexts } from "@/lib/store-static-texts";

/** Vitrin iframe — güncel ürün fiyat, başlık, görsel (prebuild stale olsa bile DB) */
export async function GET() {
  const site = await getDefaultSite();
  const locale = await getStoreLocaleFromHeaders();
  const products = await loadHomeListingProducts(site.id);
  const settings = await getSiteSettingsUncached(site.id);
  const texts = resolveMirrorCollectionTexts(locale, settings.store?.texts);

  return NextResponse.json(
    { products, texts },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
