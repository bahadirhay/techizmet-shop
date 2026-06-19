import "server-only";

import { blogPostHref } from "@/lib/blog/blog-post-types";
import { blogExcerpt, blogTitle } from "@/lib/blog/blog-post-types";
import type { BlogPostRecord } from "@/lib/blog/blog-post-types";
import type { ShopLocale } from "@/lib/i18n/locale";
import { getPublicSiteUrl } from "@/lib/seo/site-url";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function absoluteUrl(path: string): string {
  const root = getPublicSiteUrl();
  if (path.startsWith("http")) return path;
  return `${root}${path.startsWith("/") ? "" : "/"}${path}`;
}

function imageAbsolute(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  return absoluteUrl(trimmed);
}

export function buildBlogRssFeed(
  posts: BlogPostRecord[],
  options: { siteName: string; locale: ShopLocale; description?: string },
): string {
  const root = getPublicSiteUrl();
  const feedUrl = `${root}/blogs/news/feed.xml`;
  const channelLink = `${root}/blogs/news`;
  const locale = options.locale;
  const channelDesc =
    options.description?.trim() ||
    `${options.siteName} — köpek ödül mamaları, bakım ipuçları ve haberler.`;

  const items = posts
    .slice(0, 50)
    .map((post) => {
      const title = escapeXml(blogTitle(post, locale));
      const link = absoluteUrl(blogPostHref(post.slug));
      const pubDate = (post.publishedAt ?? new Date()).toUTCString();
      const excerpt = escapeXml(stripHtml(blogExcerpt(post, locale) || blogTitle(post, locale)));
      const author = escapeXml(post.author?.trim() || options.siteName);
      const image = imageAbsolute(post.imageUrl);
      const guid = link;

      return `<item>
  <title>${title}</title>
  <link>${link}</link>
  <guid isPermaLink="true">${guid}</guid>
  <pubDate>${pubDate}</pubDate>
  <author>${author}</author>
  <description>${excerpt}</description>${image ? `\n  <enclosure url="${escapeXml(image)}" type="image/jpeg" />` : ""}
</item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(options.siteName)} — Blog</title>
  <link>${channelLink}</link>
  <description>${escapeXml(channelDesc)}</description>
  <language>${locale === "en" ? "en" : "tr"}</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`;
}

export function blogFeedPath(): string {
  return "/blogs/news/feed.xml";
}

export function blogFeedUrl(): string {
  return `${getPublicSiteUrl()}${blogFeedPath()}`;
}
