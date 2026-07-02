import "server-only";

import { unstable_cache } from "next/cache";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  getCachedParsedSiteSettings,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import { filtersCacheKey, type ActiveCollectionFilters, emptyActiveCollectionFilters } from "@/lib/collection-filter-facets";
import { loadCollectionCatalogCore } from "@/lib/mirror-collection-catalog-data";
import type { CollectionFramePayload } from "@/lib/mirror-collection-payload-types";

export type {
  CollectionCatalogPayload,
  CollectionFramePayload,
} from "@/lib/mirror-collection-payload-types";

export { loadCollectionCatalogCore } from "@/lib/mirror-collection-catalog-data";

export function getCollectionCatalogPayload(
  siteId: string,
  databaseUrl: string,
  slug: string,
  locale: ShopLocale,
  categorySlug?: string,
  page = 1,
  titleHint?: string,
  activeFilters?: ActiveCollectionFilters,
): Promise<import("@/lib/mirror-collection-payload-types").CollectionCatalogPayload> {
  const cat = categorySlug?.trim() || "";
  const filterKey = filtersCacheKey(activeFilters ?? emptyActiveCollectionFilters());
  const dbKey = databaseUrl.trim() || "default";
  return unstable_cache(
    () =>
      loadCollectionCatalogCore(
        siteId,
        slug,
        locale,
        cat || undefined,
        page,
        titleHint,
        activeFilters ?? emptyActiveCollectionFilters(),
        databaseUrl,
      ),
    ["collection-catalog-v4", siteId, dbKey, slug, locale, cat, String(page), titleHint ?? "", filterKey],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId), "store-products"],
    },
  )();
}

async function loadCollectionFramePayloadCore(
  siteId: string,
  databaseUrl: string,
  slug: string,
  locale: ShopLocale,
  categorySlug?: string,
  page = 1,
  titleHint?: string,
  activeFilters?: ActiveCollectionFilters,
): Promise<CollectionFramePayload> {
  const { getSiteBranding } = await import("@/lib/site-settings-branding");
  const { loadMirrorNavItems } = await import("@/lib/mirror-nav-server");
  const { loadMirrorFooterData } = await import("@/lib/mirror-footer-server");

  const settings = await getCachedParsedSiteSettings(siteId, databaseUrl);
  const branding = getSiteBranding(settings);
  const [catalog, nav, footer] = await Promise.all([
    getCollectionCatalogPayload(siteId, databaseUrl, slug, locale, categorySlug, page, titleHint, activeFilters),
    loadMirrorNavItems(siteId, locale),
    loadMirrorFooterData(siteId, locale),
  ]);

  return { ...catalog, branding, nav, footer };
}

export function getCollectionFramePayload(
  siteId: string,
  databaseUrl: string,
  slug: string,
  locale: ShopLocale,
  categorySlug?: string,
  page = 1,
  titleHint?: string,
  activeFilters?: ActiveCollectionFilters,
): Promise<CollectionFramePayload> {
  const cat = categorySlug?.trim() || "";
  const filterKey = filtersCacheKey(activeFilters ?? emptyActiveCollectionFilters());
  const dbKey = databaseUrl.trim() || "default";
  return unstable_cache(
    () =>
      loadCollectionFramePayloadCore(
        siteId,
        databaseUrl,
        slug,
        locale,
        cat || undefined,
        page,
        titleHint,
        activeFilters,
      ),
    ["collection-frame-v4", siteId, dbKey, slug, locale, cat, String(page), filterKey],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId), "store-products"],
    },
  )();
}
