import { parseHTML } from "linkedom";

/**
 * Koleksiyon sayfası sıralama menüsü (Shopify mirror HTML).
 * Tam ifadeler kısa anahtarlardan (Price, Featured) ÖNCE çevrilmeli — aksi halde TR+EN karışımı oluşur.
 */
export const MIRROR_COLLECTION_SORT_TR_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["Price, low to high", "Fiyat, düşükten yükseğe"],
  ["Price, high to low", "Fiyat, yüksekten düşüğe"],
  ["Alphabetically, A-Z", "Alfabetik, A–Z"],
  ["Alphabetically, Z-A", "Alfabetik, Z–A"],
  ["Best selling", "En çok satan"],
  ["Featured", "Öne çıkan"],
  ["Sort by", "Sırala"],
];

/** Vitrinde gösterilmeyen sıralama seçenekleri (Shopify value) */
export const HIDDEN_COLLECTION_SORT_VALUES = [
  "most-relevant",
  "created-ascending",
  "created-descending",
] as const;

export function pruneCollectionSortOptions(document: Document): void {
  for (const value of HIDDEN_COLLECTION_SORT_VALUES) {
    document.querySelectorAll(`input[name="sort_by"][value="${value}"]`).forEach((input) => {
      const li = input.closest("li.filter-option-item");
      li?.remove();
    });
  }
}

export function pruneCollectionSortOptionsHtml(html: string): string {
  const { document } = parseHTML(html);
  pruneCollectionSortOptions(document);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}

export function isCollectionMirrorPath(normalized: string): boolean {
  return /\/mirror\/collections\/[^/]+\.html$/i.test(normalized.replace(/\\/g, "/"));
}
