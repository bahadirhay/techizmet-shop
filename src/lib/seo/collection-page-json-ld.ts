import "server-only";

import { getDefaultSite } from "@/lib/site";
import {
  buildBreadcrumbListJsonLd,
  buildCollectionPageJsonLd as buildCollectionSchema,
  buildFaqPageJsonLd,
  buildItemListJsonLd,
} from "@/lib/seo/json-ld";
import { loadCollectionSeo } from "@/lib/seo/collection-seo";
import { findIntentForPath, mergeFaqsForPath } from "@/lib/seo/search-intent";
import { prisma } from "@/lib/prisma";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

async function loadListingProducts(siteId: string, keywords?: string[], limit = 24) {
  const rows = await prisma.storeProduct.findMany({
    where: { siteId, ...storefrontListedWhere },
    orderBy: { title: "asc" },
    take: keywords?.length ? 80 : limit,
    select: {
      slug: true,
      title: true,
      description: true,
      imageUrl: true,
      priceMinor: true,
      images: {
        where: { mediaType: "image" },
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });
  const filtered = keywords?.length
    ? rows.filter((r) => {
        const hay = `${r.title} ${r.description ?? ""}`.toLocaleLowerCase("tr-TR");
        const hits = keywords.filter((k) => hay.includes(k.toLocaleLowerCase("tr-TR"))).length;
        return hits >= Math.min(2, keywords.length);
      })
    : rows;
  return filtered.slice(0, limit);
}

export async function buildCollectionPageJsonLd(slug: string, categorySlug?: string | null) {
  const ctx = await loadCollectionSeo(slug, categorySlug);
  if (!ctx) return null;

  const site = await getDefaultSite();
  const breadcrumbs = [
    { name: "Ana sayfa", path: "/" },
    { name: "Koleksiyonlar", path: "/collections" },
    { name: ctx.breadcrumbLabel, path: ctx.canonicalPath },
  ];

  const blocks: Record<string, unknown>[] = [
    buildCollectionSchema({
      name: ctx.collectionName,
      description: ctx.metaDescription ?? ctx.collectionDescription,
      collectionPath: ctx.canonicalPath,
      siteName: site.name,
    }),
    buildBreadcrumbListJsonLd(breadcrumbs),
  ];

  const intent = findIntentForPath(ctx.canonicalPath);
  const faqs = mergeFaqsForPath(ctx.canonicalPath);
  if (faqs.length) {
    blocks.push(buildFaqPageJsonLd(faqs, ctx.canonicalPath));
  }

  const products = await loadListingProducts(site.id, intent?.productKeywords);
  if (products.length) {
    blocks.push(
      buildItemListJsonLd(
        products.map((p) => ({
          name: p.title,
          url: `/products/${p.slug}`,
        })),
        intent?.h1 ?? ctx.collectionName,
        ctx.canonicalPath,
      ),
    );
  }

  return blocks;
}
