import type { MetadataRoute } from "next";
import { buildStoreSitemapEntries } from "@/lib/seo/sitemap-builder";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { getDefaultSite } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const root = getPublicSiteUrl();
  if (!process.env.DATABASE_URL) {
    return [{ url: root, lastModified: new Date(), changeFrequency: "daily", priority: 1 }];
  }

  const site = await getDefaultSite();
  return buildStoreSitemapEntries(site.id);
}
