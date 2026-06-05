import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

export const loadPublishedProductSeo = cache(async (slug: string) => {
  const site = await getDefaultSite();
  const product = await prisma.storeProduct.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      seoTitle: true,
      seoDescription: true,
      imageUrl: true,
      sku: true,
      priceMinor: true,
      stockQty: true,
      published: true,
      collection: { select: { slug: true, title: true } },
      brand: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, mediaType: true } },
      variants: { select: { stockQty: true, priceMinor: true, isDefault: true, sku: true } },
    },
  });

  if (!product?.published) return null;

  const galleryUrls =
    product.images.length > 0
      ? product.images.filter((i) => i.mediaType !== "video").map((i) => i.url)
      : product.imageUrl
        ? [product.imageUrl]
        : [];

  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  const priceMinor = defaultVariant?.priceMinor ?? product.priceMinor;
  const inStock =
    product.variants.length > 0
      ? product.variants.some((v) => v.stockQty > 0)
      : product.stockQty > 0;

  return {
    site,
    product,
    metaTitle: product.seoTitle?.trim() || product.title,
    metaDescription:
      product.seoDescription?.trim() ||
      product.description?.trim().slice(0, 160) ||
      null,
    imageUrl: galleryUrls[0] ?? null,
    imageUrls: galleryUrls,
    priceMinor,
    inStock,
    sku: product.sku ?? defaultVariant?.sku ?? null,
  };
});
