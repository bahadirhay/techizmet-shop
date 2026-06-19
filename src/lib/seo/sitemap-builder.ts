import "server-only";

import { MIRROR_CONTENT_PAGE_SLUGS } from "@/lib/mirror-vitrin-pages";
import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { prisma } from "@/lib/prisma";

export async function buildStoreSitemapEntries(siteId: string): Promise<MetadataRoute.Sitemap> {
  const root = getPublicSiteUrl();
  const now = new Date();

  const [products, collections, pages, categories, blogPosts] = await Promise.all([
    prisma.storeProduct.findMany({
      where: { siteId, published: true },
      select: { slug: true, updatedAt: true, imageUrl: true },
    }),
    prisma.storeCollection.findMany({
      where: { siteId, published: true },
      select: { slug: true, imageUrl: true },
    }),
    prisma.shopPage.findMany({
      where: { siteId, published: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.storeCategory.findMany({
      where: { siteId, active: true },
      select: { slug: true },
    }),
    prisma.storeBlogPost.findMany({
      where: { siteId, published: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: root, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${root}/collections`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${root}/collections/all`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  if (blogPosts.length) {
    staticRoutes.push({
      url: `${root}/blogs/news`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  const mirrorPageRoutes: MetadataRoute.Sitemap = MIRROR_CONTENT_PAGE_SLUGS.map((slug) => ({
    url: `${root}/pages/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const dbPageSlugs = new Set(pages.filter((p) => p.slug !== "home").map((p) => p.slug));
  const extraMirrorPages = mirrorPageRoutes.filter(
    (r) => !dbPageSlugs.has(r.url.replace(`${root}/pages/`, "")),
  );

  return [
    ...staticRoutes,
    ...collections
      .filter((c) => c.slug !== "all")
      .map((c) => ({
        url: `${root}/collections/${c.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...categories.map((c) => ({
      url: `${root}/collections/all?category=${encodeURIComponent(c.slug)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
    ...products.map((p) => ({
      url: `${root}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      ...(p.imageUrl?.trim()
        ? {
            images: [p.imageUrl.trim().startsWith("http") ? p.imageUrl.trim() : `${root}${p.imageUrl.trim().startsWith("/") ? "" : "/"}${p.imageUrl.trim()}`],
          }
        : {}),
    })),
    ...pages
      .filter((p) => p.slug !== "home")
      .map((p) => ({
        url: `${root}/pages/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.55,
      })),
    ...extraMirrorPages,
    ...blogPosts.map((p) => ({
      url: `${root}/blogs/news/${p.slug}`,
      lastModified: p.updatedAt ?? p.publishedAt ?? now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
