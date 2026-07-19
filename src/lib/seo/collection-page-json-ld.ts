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

async function loadListingProducts(siteId: string, limit = 24) {
  return prisma.storeProduct.findMany({
    where: { siteId, ...storefrontListedWhere },
    orderBy: { title: "asc" },
    take: limit,
    select: {
      slug: true,
      title: true,
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

  const products = await loadListingProducts(site.id);
  if (products.length) {
    blocks.push(
      buildItemListJsonLd(
        products.map((p) => ({
          name: p.title,
          url: `/products/${p.slug}`,
          image: p.imageUrl ?? p.images[0]?.url,
          priceMinor: p.priceMinor,
          currency: site.currency,
        })),
        intent?.h1 ?? ctx.collectionName,
        ctx.canonicalPath,
      ),
    );
  }

  return blocks;
}
