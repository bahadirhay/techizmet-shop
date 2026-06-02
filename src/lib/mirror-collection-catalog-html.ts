import { parseHTML } from "linkedom";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  applyCollectionCategoryFiltersFromAdmin,
  applyCollectionDetailFromAdmin,
  applyCollectionProductsFromAdmin,
} from "@/lib/mirror-collections-sync";
import { loadCollectionCatalogCore } from "@/lib/mirror-collection-catalog-data";
import type { CollectionCatalogPayload } from "@/lib/mirror-collection-payload-types";
import { collectionMirrorFileRel } from "@/lib/mirror-html-path";
import { readPrebuiltMirrorHtml } from "@/lib/mirror-prebuilt-io";

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
    {
      currentPage: page,
      basePath: payload.paginationBasePath,
      totalCount: payload.totalProductCount,
    },
  );
  return serializeMirrorDocument(html, document);
}

/** Prebuild — hazır all.html üzerine yalnızca kategori ürünleri (tam mirror build yok) */
export async function buildCategoryCollectionHtmlFromBase(
  siteId: string,
  locale: ShopLocale,
  categorySlug: string,
  baseHtml: string,
  page = 1,
): Promise<string> {
  const payload = await loadCollectionCatalogCore(siteId, "all", locale, categorySlug, page);
  return applyCollectionCatalogToMirrorHtml(baseHtml, payload, locale, page);
}

/** Yedek — all prebuilt yoksa hata (deploy önce all.html üretilmeli) */
export async function buildCategoryCollectionHtmlForPrebuild(
  siteId: string,
  _siteName: string,
  locale: ShopLocale,
  categorySlug: string,
  page = 1,
  baseHtml?: string,
): Promise<string> {
  const base =
    baseHtml ?? (await readPrebuiltMirrorHtml(collectionMirrorFileRel("all", locale)));
  if (!base) {
    throw new Error(
      `Prebuilt ${collectionMirrorFileRel("all", locale)} yok — önce collections/all prebuild çalıştırın.`,
    );
  }
  return buildCategoryCollectionHtmlFromBase(siteId, locale, categorySlug, base, page);
}
