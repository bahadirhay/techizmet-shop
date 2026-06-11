import type { MetadataRoute } from "next";
import { buildStoreRobots } from "@/lib/seo/robots-builder";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (!process.env.DATABASE_URL) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap: `${getPublicSiteUrl()}/sitemap.xml`,
    };
  }

  const site = await getDefaultSite();
  const settings = await getSiteSettings(site.id);
  return buildStoreRobots(settings, site.name);
}
