import "server-only";

import { unstable_cache } from "next/cache";
import type { VitrinCollectionDetail } from "@/lib/mirror-collections-sync";
import type {
  CollectionCatalogPayload,
  CollectionFramePayload,
} from "@/lib/mirror-collection-payload-types";

export type { CollectionCatalogPayload, CollectionFramePayload } from "@/lib/mirror-collection-payload-types";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  getCachedParsedSiteSettings,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import { getSiteBranding } from "@/lib/site-settings-branding";
import { loadMirrorFooterData } from "@/lib/mirror-footer-server";
import { loadMirrorNavItems } from "@/lib/mirror-nav-server";
import type { MirrorBranding } from "@/lib/mirror-branding-overlay";
import type { MirrorFooterData } from "@/lib/mirror-footer-overlay";
import type { MirrorNavItem } from "@/lib/mirror-nav-overlay";
import { resolveMirrorCollectionTexts } from "@/lib/store-static-texts";
import type { ResolvedMirrorCollectionTexts } from "@/lib/store-static-texts";
import { prisma } from "@/lib/prisma";
import { getCategoryFilterOptions, getCategoryScopeIds } from "@/lib/store-category-tree";

export async function loadCollectionCatalogCore(
  siteId: string,
  slug: string,
  locale: ShopLocale,
  categorySlug?: string,
  page = 1,
  titleHint?: string,
): Promise<CollectionCatalogPayload> {
  const settings = await getCachedParsedSiteSettings(siteId);
  const mirrorTexts = resolveMirrorCollectionTexts(locale, settings.store?.texts);

  const [row, categories] = await Promise.all([
    categorySlug
      ? prisma.storeCategory.findFirst({
          where: { siteId, slug: categorySlug, active: true },
          select: { title: true, description: true, seoDescription: true, imageUrl: true },
        })
      : prisma.storeCollection.findUnique({
          where: { siteId_slug: { siteId, slug } },
          select: { title: true, description: true, imageUrl: true },
        }),
    prisma.storeCategory.findMany({
      where: { siteId, active: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, slug: true, title: true, parentId: true },
    }),
  ]);

  const categoryScopeIds = getCategoryScopeIds(categories, categorySlug);
  const products = await prisma.storeProduct.findMany({
    where: {
      siteId,
      published: true,
      ...(categorySlug
        ? categoryScopeIds?.length
          ? {
              OR: [
                { categoryId: { in: categoryScopeIds } },
                { categoryLinks: { some: { categoryId: { in: categoryScopeIds } } } },
              ],
            }
          : { category: { is: { slug: categorySlug, active: true } } }
        : slug === "all"
          ? {}
          : { collection: { slug } }),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      slug: true,
      title: true,
      imageUrl: true,
      priceMinor: true,
      compareAtMinor: true,
      stockQty: true,
      lowStockThreshold: true,
      badgesJson: true,
    },
  });

  const paginationBasePath = categorySlug
    ? `/collections/all?category=${encodeURIComponent(categorySlug)}`
    : slug === "all"
      ? "/collections/all"
      : `/collections/${encodeURIComponent(slug)}`;

  const collectionFromAdmin: VitrinCollectionDetail | null = row
    ? {
        title: row.title,
        description:
          typeof row.description === "string" && row.description.trim()
            ? row.description
            : "seoDescription" in row &&
                typeof row.seoDescription === "string" &&
                row.seoDescription.trim()
              ? row.seoDescription
              : null,
        imageUrl: "imageUrl" in row && typeof row.imageUrl === "string" ? row.imageUrl : null,
      }
    : slug === "all"
      ? { title: titleHint ?? "Tüm ürünler", description: null, imageUrl: null }
      : null;

  return {
    collectionFromAdmin,
    productsFromAdmin: products,
    categoriesFromAdmin: getCategoryFilterOptions(categories, categorySlug).map((c) => ({
      slug: c.slug,
      title: c.title,
    })),
    activeCategorySlug: categorySlug,
    mirrorTexts,
    paginationBasePath,
    title: row?.title ?? titleHint ?? (slug === "all" ? "Tüm ürünler" : slug),
  };
}

export function getCollectionCatalogPayload(
  siteId: string,
  slug: string,
  locale: ShopLocale,
  categorySlug?: string,
  page = 1,
  titleHint?: string,
): Promise<CollectionCatalogPayload> {
  const cat = categorySlug?.trim() || "";
  return unstable_cache(
    () => loadCollectionCatalogCore(siteId, slug, locale, cat || undefined, page, titleHint),
    ["collection-catalog-v1", siteId, slug, locale, cat, String(page), titleHint ?? ""],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId), "store-products"],
    },
  )();
}

async function loadCollectionFramePayloadCore(
  siteId: string,
  slug: string,
  locale: ShopLocale,
  categorySlug?: string,
  page = 1,
  titleHint?: string,
): Promise<CollectionFramePayload> {
  const settings = await getCachedParsedSiteSettings(siteId);
  const branding = getSiteBranding(settings);
  const [catalog, nav, footer] = await Promise.all([
    getCollectionCatalogPayload(siteId, slug, locale, categorySlug, page, titleHint),
    loadMirrorNavItems(siteId, locale),
    loadMirrorFooterData(siteId, locale),
  ]);

  return { ...catalog, branding, nav, footer };
}

export function getCollectionFramePayload(
  siteId: string,
  slug: string,
  locale: ShopLocale,
  categorySlug?: string,
  page = 1,
  titleHint?: string,
): Promise<CollectionFramePayload> {
  const cat = categorySlug?.trim() || "";
  return unstable_cache(
    () => loadCollectionFramePayloadCore(siteId, slug, locale, cat || undefined, page, titleHint),
    ["collection-frame-v1", siteId, slug, locale, cat, String(page)],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId), "store-products"],
    },
  )();
}
