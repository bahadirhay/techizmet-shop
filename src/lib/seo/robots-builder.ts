import "server-only";

import type { MetadataRoute } from "next";
import { getPublicSiteHost, getPublicSiteUrl } from "@/lib/seo/site-url";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteSeo } from "@/lib/site-settings";

const DISALLOW = ["/admin/", "/api/", "/checkout/", "/cart", "/account/", "/bakim/"];

/** Ürün görselleri /api/media altında — genel /api/ engeli bunları da kapatıyordu */
const GOOGLE_CRAWL_ALLOW = ["/", "/products/", "/api/media/", "/uploads/", "/feeds/", "/_mirror-prebuilt/"];

const GOOGLE_IMAGE_ALLOW = ["/", "/products/", "/api/media/", "/uploads/", "/_mirror-prebuilt/"];

export function buildStoreRobots(settings: SiteSettings, siteName: string): MetadataRoute.Robots {
  const seo = getSiteSeo(settings, siteName);
  const sitemap = `${getPublicSiteUrl()}/sitemap.xml`;

  if (!seo.robotsIndex) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap,
    };
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: "Googlebot", allow: GOOGLE_CRAWL_ALLOW, disallow: DISALLOW },
      { userAgent: "Googlebot-Image", allow: GOOGLE_IMAGE_ALLOW, disallow: ["/admin/", "/api/admin/"] },
      { userAgent: "Bingbot", allow: "/", disallow: DISALLOW },
      { userAgent: "Yandex", allow: "/", disallow: DISALLOW },
      { userAgent: "DuckDuckBot", allow: "/", disallow: DISALLOW },
    ],
    sitemap,
    host: getPublicSiteHost(),
  };
}
