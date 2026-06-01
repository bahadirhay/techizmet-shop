import "server-only";

import { parseHTML } from "linkedom";
import { unstable_cache } from "next/cache";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  applyCollectionCategoryFiltersFromAdmin,
  applyCollectionDetailFromAdmin,
  applyCollectionProductsFromAdmin,
} from "@/lib/mirror-collections-sync";
import {
  loadCollectionCatalogCore,
  type CollectionCatalogPayload,
} from "@/lib/mirror-collection-frame-server";
import { buildMirrorHtmlCore } from "@/lib/mirror-html-processor";
import { collectionMirrorFileRel } from "@/lib/mirror-html-path";

function serializeMirrorDocument(html: string, document: Document): string {
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  document.documentElement.setAttribute("data-kn-collection-catalog", "1");
  return `${doctype}\n${document.documentElement.outerHTML}`;
}

export function applyCollectionCatalogToMirrorHtml(
  html: string,
  payload: CollectionCatalogPayload,
  locale: ShopLocale,
  page = 1,
): string {
  const { document } = parseHTML(html);
  if (payload.collectionFromAdmin) {
    applyCollectionDetailFromAdmin(document, payload.collectionFromAdmin);
  }
  if (payload.categoriesFromAdmin.length) {
    applyCollectionCategoryFiltersFromAdmin(
      document,
      payload.categoriesFromAdmin,
      locale,
      payload.activeCategorySlug,
      payload.mirrorTexts,
    );
  }
  applyCollectionProductsFromAdmin(
    document,
    payload.productsFromAdmin,
    locale,
    payload.mirrorTexts,
    { currentPage: page, basePath: payload.paginationBasePath },
  );
  return serializeMirrorDocument(html, document);
}

/** Deploy prebuild — tam mirror + kategori ürünleri (runtime parse yok) */
export async function buildCategoryCollectionHtmlForPrebuild(
  siteId: string,
  siteName: string,
  locale: ShopLocale,
  categorySlug: string,
  page = 1,
): Promise<string> {
  const sourceRel = collectionMirrorFileRel("all", locale);
  const html = await buildMirrorHtmlCore({
    normalized: sourceRel,
    locale,
    siteId,
    siteName,
  });
  const payload = await loadCollectionCatalogCore(siteId, "all", locale, categorySlug, page);
  return applyCollectionCatalogToMirrorHtml(html, payload, locale, page);
}

async function buildCategoryCollectionHtmlCore(
  siteId: string,
  siteName: string,
  locale: ShopLocale,
  categorySlug: string,
  collectionSlug: string,
  page: number,
  titleHint?: string,
): Promise<string> {
  return buildCategoryCollectionHtmlForPrebuild(
    siteId,
    siteName,
    locale,
    categorySlug,
    page,
  );
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
