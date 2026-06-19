import { NextResponse } from "next/server";
import { listPublishedBlogPosts } from "@/lib/blog/blog-posts-server";
import { buildBlogRssFeed } from "@/lib/seo/rss-feed";
import { getStoreLocaleFromHeaders } from "@/lib/i18n/server";
import { getDefaultSite } from "@/lib/site";
import { getSiteSeo, getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

/** Blog RSS — arama motorları, Feedly, Google Publisher Center */
export async function GET() {
  const site = await getDefaultSite();
  const locale = await getStoreLocaleFromHeaders();
  const settings = await getSiteSettings(site.id);
  const seo = getSiteSeo(settings, site.name);
  const posts = await listPublishedBlogPosts(site.id);

  if (!posts.length) {
    return new NextResponse("No posts", { status: 404 });
  }

  const xml = buildBlogRssFeed(posts, {
    siteName: seo.siteTitle || site.name,
    locale,
    description: seo.staticPages?.["/blogs/news"]?.seoDescription,
  });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
