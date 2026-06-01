import "server-only";

import { unstable_cache } from "next/cache";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import { buildCategoryCollectionHtmlForPrebuild } from "@/lib/mirror-collection-catalog-html";

async function buildCategoryCollectionHtmlCore(
  siteId: string,
  siteName: string,
  locale: ShopLocale,
  categorySlug: string,
  collectionSlug: string,
  page: number,
  titleHint?: string,
): Promise<string> {
  void collectionSlug;
  void titleHint;
  return buildCategoryCollectionHtmlForPrebuild(siteId, siteName, locale, categorySlug, page);
}

export function getCategoryCollectionMirrorHtml(
  siteId: string,
  siteName: string,
  locale: ShopLocale,
  categorySlug: string,
  collectionSlug = "all",
  page = 1,
  titleHint?: string,
): Promise<string> {
  const cat = categorySlug.trim();
  return unstable_cache(
    () =>
      buildCategoryCollectionHtmlCore(
        siteId,
        siteName,
        locale,
        cat,
        collectionSlug,
        page,
        titleHint,
      ),
    ["collection-html-v2", siteId, locale, cat, collectionSlug, String(page), titleHint ?? ""],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId), "store-products"],
    },
  )();
}
