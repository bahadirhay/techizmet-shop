import type { MetadataRoute } from "next";
import { getDefaultSite } from "@/lib/site";
import { getSiteSeo, getSiteSettings } from "@/lib/site-settings";

const base = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:5555";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  const seo = getSiteSeo(settings, site.name);

  return {
    rules: seo.robotsIndex
      ? { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${base()}/sitemap.xml`,
  };
}
