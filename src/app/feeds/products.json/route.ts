import { NextResponse } from "next/server";
import { buildAiProductsFeed } from "@/lib/seo/ai-products-feed";
import { getDefaultSite } from "@/lib/site";
import { getSiteSeo, getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/** Yapılandırılmış ürün kataloğu — AI arama ve alıntı sistemleri için */
export async function GET() {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const seo = getSiteSeo(settings, site.name);

  const feed = await buildAiProductsFeed(
    site.id,
    seo.siteTitle || site.name,
    seo.metaDescription,
    settings.googleMerchant,
  );

  return NextResponse.json(feed, {
    headers: {
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
