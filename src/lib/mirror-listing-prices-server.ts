import "server-only";

import { prisma } from "@/lib/prisma";
import {
  applyCatalogPricesToHtml,
  type CatalogPriceMap,
} from "@/lib/mirror-listing-prices";

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
