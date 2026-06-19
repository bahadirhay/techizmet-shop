/** DB fiyat haritası — prebuild (tsx) ve runtime; server-only değil */
import { prisma } from "@/lib/prisma";
import { parseHTML } from "@/lib/linkedom-server";
import {
  applyCatalogPricesToDocument,
  injectCatalogPriceMapScript,
  type CatalogPriceMap,
} from "@/lib/mirror-listing-prices";

export function applyCatalogPricesToHtml(html: string, map: CatalogPriceMap): string {
  if (!Object.keys(map).length) return html;
  const withScript = injectCatalogPriceMapScript(html, map);
  const { document } = parseHTML(withScript);
  applyCatalogPricesToDocument(document, map);
  const doctype = html.match(/^<!DOCTYPE[^>]*>/i)?.[0] ?? "<!DOCTYPE html>";
  return `${doctype}\n${document.documentElement.outerHTML}`;
}

export async function loadCatalogPriceMap(siteId: string): Promise<CatalogPriceMap> {
  const rows = await prisma.storeProduct.findMany({
    where: { siteId, published: true },
    select: { slug: true, priceMinor: true, compareAtMinor: true },
  });
  const map: CatalogPriceMap = {};
  for (const row of rows) {
    map[row.slug] = { priceMinor: row.priceMinor, compareAtMinor: row.compareAtMinor };
  }
  return map;
}

export async function syncMirrorListingPricesInHtml(html: string, siteId: string): Promise<string> {
  const map = await loadCatalogPriceMap(siteId);
  return applyCatalogPricesToHtml(html, map);
}
