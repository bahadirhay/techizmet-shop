import type { MetadataRoute } from "next";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const base = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:5555";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const root = base();
  if (!process.env.DATABASE_URL) {
    return [{ url: root, lastModified: new Date(), changeFrequency: "daily", priority: 1 }];
  }

  const site = await getDefaultSite();
  const [products, collections, pages] = await Promise.all([
    prisma.storeProduct.findMany({
      where: { siteId: site.id, published: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.storeCollection.findMany({
      where: { siteId: site.id, published: true },
      select: { slug: true },
    }),
    prisma.shopPage.findMany({
      where: { siteId: site.id, published: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: root, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${root}/collections`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${root}/collections/all`, changeFrequency: "weekly", priority: 0.85 },
  ];

  return [
    ...staticRoutes,
    ...collections
      .filter((c) => c.slug !== "all")
      .map((c) => ({
        url: `${root}/collections/${c.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...products.map((p) => ({
      url: `${root}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...pages.map((p) => ({
      url: `${root}/pages/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
