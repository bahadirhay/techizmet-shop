/**
 * Prebuild HTML stale olsa bile vitrin kartlarını DB ile senkronlar (fiyat, başlık, görsel).
 */

import {
  applyCollectionsTabToSection,
  enrichCollectionsTabsFromProductOptions,
  extractCollectionsTabFromHtml,
} from "@/lib/mirror-collections-tab";
import type { VitrinCollectionProductCard } from "@/lib/mirror-collections-sync";
import { applyHomeListingProductsToDocument } from "@/lib/mirror-home-products-inject";
import type { MirrorPageConfig } from "@/lib/mirror-home-overlay";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  applyCatalogPricesToDocument,
  type CatalogPriceMap,
} from "@/lib/mirror-listing-prices";
import { formatTry } from "@/lib/format";
import type { ResolvedMirrorCollectionTexts } from "@/lib/store-static-texts";

export type LiveStoreCatalogPayload = {
  products: VitrinCollectionProductCard[];
  texts: ResolvedMirrorCollectionTexts;
};

function catalogPriceMap(products: VitrinCollectionProductCard[]): CatalogPriceMap {
  const map: CatalogPriceMap = {};
  for (const p of products) {
    map[p.slug] = { priceMinor: p.priceMinor, compareAtMinor: p.compareAtMinor ?? null };
  }
  return map;
}

function toProductOptions(products: VitrinCollectionProductCard[]) {
  return products.map((p) => ({
    slug: p.slug,
    title: p.title,
    imageUrl: p.imageUrl,
    priceLabel: formatTry(p.priceMinor),
    compareAtLabel:
      p.compareAtMinor != null && p.compareAtMinor > p.priceMinor
        ? formatTry(p.compareAtMinor)
        : null,
  }));
}

export async function fetchLiveStoreCatalog(): Promise<LiveStoreCatalogPayload | null> {
  try {
    const res = await fetch("/api/vitrin/store-catalog", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as LiveStoreCatalogPayload;
  } catch {
    return null;
  }
}

export function applyLiveStoreCatalogToDocument(
  doc: Document,
  payload: LiveStoreCatalogPayload,
  locale: ShopLocale,
  pageConfig?: MirrorPageConfig,
  mirrorTexts?: ResolvedMirrorCollectionTexts,
) {
  const { products, texts } = payload;
  if (!products.length) return;

  const resolvedTexts = texts ?? mirrorTexts;
  applyCatalogPricesToDocument(doc, catalogPriceMap(products));

  if (resolvedTexts) {
    applyHomeListingProductsToDocument(doc, products, locale, resolvedTexts);
  }

  const options = toProductOptions(products);
  const patchedSections = new Set<string>();

  if (pageConfig?.sections) {
    for (const [sectionKey, edit] of Object.entries(pageConfig.sections)) {
      if (!edit?.collectionsTabs?.length) continue;
      const sectionEl = doc.querySelector(`section[id$="__${sectionKey}"]`);
      if (!sectionEl) continue;
      const tabs = enrichCollectionsTabsFromProductOptions(edit.collectionsTabs, options);
      applyCollectionsTabToSection(sectionEl, tabs, locale);
      patchedSections.add(sectionKey);
    }
  }

  doc.querySelectorAll("section .collections-tab--menu").forEach((menu) => {
    const sectionEl = menu.closest("section");
    if (!sectionEl) return;
    const sectionKey = sectionEl.id.match(/__([a-zA-Z0-9_-]+)$/)?.[1];
    if (!sectionKey || patchedSections.has(sectionKey)) return;
    const defaults = extractCollectionsTabFromHtml(sectionEl.outerHTML, sectionKey);
    if (!defaults.length) return;
    const tabs = enrichCollectionsTabsFromProductOptions(defaults, options);
    applyCollectionsTabToSection(sectionEl, tabs, locale);
    patchedSections.add(sectionKey);
  });

  doc.documentElement.setAttribute("data-kn-catalog-live", "1");
}
