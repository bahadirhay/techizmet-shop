import { NextResponse } from "next/server";
import { buildGoogleMerchantFeedForSite } from "@/lib/seo/google-merchant-feed";
import { getDefaultSite } from "@/lib/site";
import { getSiteSeo, getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/**
 * Google Merchant Center ürün feed — RSS 2.0 + g: namespace
 * @see https://support.google.com/merchants/answer/14987622
 */
export async function GET(req: Request) {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const seo = getSiteSeo(settings, site.name);
  const gmc = settings.googleMerchant;

  if (gmc?.enabled === false) {
    return new NextResponse("Feed disabled", { status: 404 });
  }

  const token = gmc?.feedToken?.trim();
  if (token) {
    const url = new URL(req.url);
    if (url.searchParams.get("token") !== token) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const { xml, itemCount } = await buildGoogleMerchantFeedForSite(site.id, seo.siteTitle || site.name, gmc);

  if (!itemCount) {
    return new NextResponse("No products", { status: 404 });
  }

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}
