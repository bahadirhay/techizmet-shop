import "server-only";

import { unstable_cache } from "next/cache";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  buildCategoryCollectionHtmlForPrebuild,
  buildCategoryCollectionHtmlFromBase,
} from "@/lib/mirror-collection-catalog-html";
import { categoryCollectionMirrorFileRel, collectionMirrorFileRel } from "@/lib/mirror-html-path";
import { readPrebuiltMirrorHtml } from "@/lib/mirror-prebuilt";

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
    async () => {
      void siteName;
      void titleHint;
      const categoryRel = categoryCollectionMirrorFileRel(cat, locale);
      const prebuiltCategory = await readPrebuiltMirrorHtml(categoryRel);
      if (prebuiltCategory && page === 1 && collectionSlug === "all") {
        return prebuiltCategory;
      }
      const allRel = collectionMirrorFileRel("all", locale);
      const base = await readPrebuiltMirrorHtml(allRel);
      if (base) {
        return buildCategoryCollectionHtmlFromBase(siteId, locale, cat, base, page);
      }
      return buildCategoryCollectionHtmlForPrebuild(siteId, siteName, locale, cat, page);
    },
    ["collection-html-v3", siteId, locale, cat, collectionSlug, String(page), titleHint ?? ""],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId), "store-products"],
    },
  )();
}
