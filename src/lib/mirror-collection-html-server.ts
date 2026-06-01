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
import { collectionMirrorFileRel } from "@/lib/mirror-html-path";
import { readPrebuiltMirrorHtml } from "@/lib/mirror-prebuilt";
import {
  getCollectionCatalogPayload,
  type CollectionCatalogPayload,
} from "@/lib/mirror-collection-frame-server";

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

async function buildCategoryCollectionHtmlCore(
  siteId: string,
  locale: ShopLocale,
  categorySlug: string,
  collectionSlug: string,
  page: number,
  titleHint?: string,
): Promise<string> {
  const normalized = collectionMirrorFileRel(collectionSlug === "all" ? "all" : collectionSlug, locale);
  const base =
    (await readPrebuiltMirrorHtml(normalized)) ??
    (await readPrebuiltMirrorHtml(collectionMirrorFileRel("all", locale)));
  if (!base) {
    throw new Error(`Mirror koleksiyon HTML bulunamadı: ${normalized}`);
  }

  const payload = await getCollectionCatalogPayload(
    siteId,
    collectionSlug,
    locale,
    categorySlug,
    page,
    titleHint,
  );
  return applyCollectionCatalogToMirrorHtml(base, payload, locale, page);
}

export function getCategoryCollectionMirrorHtml(
  siteId: string,
  locale: ShopLocale,
  categorySlug: string,
  collectionSlug = "all",
  page = 1,
  titleHint?: string,
): Promise<string> {
  const cat = categorySlug.trim();
  return unstable_cache(
    () => buildCategoryCollectionHtmlCore(siteId, locale, cat, collectionSlug, page, titleHint),
    ["collection-html-v1", siteId, locale, cat, collectionSlug, String(page), titleHint ?? ""],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId), "store-products"],
    },
  )();
}
