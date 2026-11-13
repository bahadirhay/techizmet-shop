import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { STORE_PUBLIC_REVALIDATE_SEC, storeMirrorTag } from "@/lib/cache/store-cache";
import { formatProductDisplayTitle } from "@/lib/product-display-title";
import {
  clampSeoDescription,
  repairStoredSeoDescription,
  repairStoredSeoTitle,
} from "@/lib/seo/seo-text";
import { descriptiveMediaUrl, loadMediaNameMap } from "@/lib/media-descriptive-url";
import { getDefaultSite } from "@/lib/site";
import { ensureStoreTenant } from "@/lib/store-tenant";

/**
 * Ürün SEO satırı — iç içe seçimler nedeniyle birkaç ardışık sorgu yapar; her istekte
 * DB'ye gitmemek için önbelleklenir. Ürün / yorum kaydında `revalidateStorePublicCache` temizler.
 */
function loadProductSeoRow(siteId: string, slug: string, databaseUrl: string) {
  return unstable_cache(
    async () => {
      const { getPrismaForDatabaseUrl } = await import("@/lib/prisma");
      return queryProductSeoRow(getPrismaForDatabaseUrl(databaseUrl), siteId, slug);
    },
    ["product-seo-row-v1", siteId, slug],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeMirrorTag(siteId), "store-products", `product:${slug}`],
    },
  )();
}

function queryProductSeoRow(
  client: ReturnType<typeof import("@/lib/prisma").getPrismaForDatabaseUrl>,
  siteId: string,
  slug: string,
) {
  return client.storeProduct.findUnique({
    where: { siteId_slug: { siteId, slug } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      seoTitle: true,
      seoDescription: true,
      imageUrl: true,
      sku: true,
      barcode: true,
      priceMinor: true,
      weightGrams: true,
      pieceCount: true,
      stockQty: true,
      published: true,
      storeVisible: true,
      collection: { select: { slug: true, title: true } },
      category: {
        select: {
          slug: true,
          title: true,
          parent: { select: { slug: true, title: true } },
        },
      },
      categoryLinks: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: {
          category: {
            select: {
              slug: true,
              title: true,
              parent: { select: { slug: true, title: true } },
            },
          },
        },
      },
      brand: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, mediaType: true } },
      variants: { select: { stockQty: true, priceMinor: true, isDefault: true, sku: true } },
    },
  });
}

export const loadPublishedProductSeo = cache(async (slug: string) => {
  const [site, tenant] = await Promise.all([getDefaultSite(), ensureStoreTenant()]);
  const product = await loadProductSeoRow(site.id, slug, tenant.databaseUrl);

  if (!product?.published || !product.storeVisible) return null;

  const rawGalleryUrls =
    product.images.length > 0
      ? product.images.filter((i) => i.mediaType !== "video").map((i) => i.url)
      : product.imageUrl
        ? [product.imageUrl]
        : [];
  const mediaNames = await loadMediaNameMap();
  const galleryUrls = rawGalleryUrls.map((url) => descriptiveMediaUrl(url, mediaNames));

  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];
  const priceMinor = defaultVariant?.priceMinor ?? product.priceMinor;
  const inStock =
    product.variants.length > 0
      ? product.variants.some((v) => v.stockQty > 0)
      : product.stockQty > 0;

  const visibleTitle = formatProductDisplayTitle({
    title: product.title,
    weightGrams: product.weightGrams,
    pieceCount: product.pieceCount,
  });

  // Eski üreticinin kestiği kayıtlar ("… | Anatoli", cümle ortasında biten açıklama) gösterimde onarılır
  const storedTitle = product.seoTitle?.trim();
  const storedDescription = product.seoDescription?.trim();

  return {
    site,
    product,
    metaTitle: storedTitle
      ? repairStoredSeoTitle(storedTitle, {
          brandName: product.brand?.name ?? site.name,
          sourceTitle: visibleTitle,
        }) || visibleTitle
      : visibleTitle,
    metaDescription:
      (storedDescription ? repairStoredSeoDescription(storedDescription) : "") ||
      (product.description?.trim() ? clampSeoDescription(product.description, 160) : "") ||
      null,
    imageUrl: galleryUrls[0] ?? null,
    imageUrls: galleryUrls,
    priceMinor,
    inStock,
    sku: product.sku ?? defaultVariant?.sku ?? null,
    barcode: product.barcode?.trim() || null,
    visibleTitle,
    visibleDescription:
      product.description?.trim() ||
      product.seoDescription?.trim().slice(0, 320) ||
      null,
  };
});
