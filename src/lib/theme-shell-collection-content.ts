import "server-only";

import { unstable_cache } from "next/cache";
import {
  emptyActiveCollectionFilters,
  filtersCacheKey,
  type ActiveCollectionFilters,
} from "@/lib/collection-filter-facets";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  getCachedParsedSiteSettings,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import { applyCollectionCatalogToMirrorHtml } from "@/lib/mirror-collection-catalog-html";
import { getCollectionCatalogPayload } from "@/lib/mirror-collection-frame-server";
import { readMirrorPageHtmlForLocale } from "@/lib/mirror-page-html";
import { getMirrorPageConfig } from "@/lib/mirror-page-settings";
import { applyMirrorPageOverlayToHtml } from "@/lib/mirror-page-overlay-server";
import {
  buildThemeShellMainContentFromHtml,
  type ThemeShellSectionsContent,
} from "@/lib/theme-shell-sections-content";

async function buildThemeShellCollectionContent(
  siteId: string,
  databaseUrl: string,
  locale: ShopLocale,
  slug: string,
  page: number,
  categorySlug: string | undefined,
  activeFilters: ActiveCollectionFilters,
): Promise<ThemeShellSectionsContent | null> {
  const raw = readMirrorPageHtmlForLocale("collections-all", locale);
  if (!raw) return null;

  const [payload, settings] = await Promise.all([
    getCollectionCatalogPayload(
      siteId,
      databaseUrl,
      slug,
      locale,
      categorySlug,
      page,
      undefined,
      activeFilters,
    ),
    getCachedParsedSiteSettings(siteId, databaseUrl),
  ]);

  let html = applyCollectionCatalogToMirrorHtml(raw, payload, locale, page);
  const config = getMirrorPageConfig(settings, "collections-all");
  if (config) {
    html = applyMirrorPageOverlayToHtml(html, config, locale);
  }
  return buildThemeShellMainContentFromHtml(html);
}

/** Koleksiyon kataloğu + admin overlay → MainContent (collections/all pilot, önbellekli) */
export function resolveThemeShellCollectionContent(
  siteId: string,
  databaseUrl: string,
  locale: ShopLocale,
  slug: string,
  page: number,
  categorySlug?: string,
  activeFilters?: ActiveCollectionFilters,
): Promise<ThemeShellSectionsContent | null> {
  const cat = categorySlug?.trim() || "";
  const filters = activeFilters ?? emptyActiveCollectionFilters();
  const filterKey = filtersCacheKey(filters);
  const dbKey = databaseUrl.trim() || "default";
  return unstable_cache(
    () =>
      buildThemeShellCollectionContent(
        siteId,
        databaseUrl,
        locale,
        slug,
        page,
        cat || undefined,
        filters,
      ),
    ["theme-shell-collection-v1", siteId, dbKey, slug, locale, cat, String(page), filterKey],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId), "store-products"],
    },
  )();
}
