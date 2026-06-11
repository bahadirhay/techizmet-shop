import "server-only";

import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import type { SiteSettings } from "@/lib/site-settings";
import { getSiteSeo } from "@/lib/site-settings";

const DISALLOW = ["/admin/", "/api/", "/checkout/", "/cart", "/account/", "/bakim/"];

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
      { userAgent: "Googlebot", allow: "/", disallow: DISALLOW },
      { userAgent: "Googlebot-Image", allow: "/", disallow: ["/admin/", "/api/"] },
      { userAgent: "Bingbot", allow: "/", disallow: DISALLOW },
      { userAgent: "Yandex", allow: "/", disallow: DISALLOW },
      { userAgent: "DuckDuckBot", allow: "/", disallow: DISALLOW },
    ],
    sitemap,
    host: getPublicSiteUrl(),
  };
}
