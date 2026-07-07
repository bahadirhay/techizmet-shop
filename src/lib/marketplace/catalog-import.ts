import { findProductByBarcodeOrSku } from "@/lib/marketplace/import-helpers";
import {
  MARKETPLACE_PRISMA_STALE_MSG,
  marketplaceProductListingDb,
} from "@/lib/marketplace/prisma-marketplace";
import type {
  MarketplaceCatalogImportResult,
  MarketplaceCatalogItem,
} from "@/lib/marketplace/catalog-types";

export async function upsertProductMarketplaceListing(
  siteId: string,
  productId: string,
  platform: string,
  data: {
    barcode?: string | null;
    listingStatus: string;
    lastError?: string | null;
    metaJson?: string | null;
  },
): Promise<boolean> {
  const listingDb = marketplaceProductListingDb();
  if (!listingDb) return false;

  const now = new Date();
  await listingDb.upsert({
    where: {
      siteId_platform_productId: { siteId, platform, productId },
    },
    create: {
      siteId,
      platform,
      productId,
      barcode: data.barcode ?? null,
      listingStatus: data.listingStatus,
      lastSyncAt: now,
      lastError: data.lastError ?? null,
      metaJson: data.metaJson ?? null,
    },
    update: {
      barcode: data.barcode ?? null,
      listingStatus: data.listingStatus,
      lastSyncAt: now,
      lastError: data.lastError ?? null,
      metaJson: data.metaJson ?? null,
    },
  });
  return true;
}

export async function importMarketplaceCatalog(
  siteId: string,
  platform: string,
  items: MarketplaceCatalogItem[],
): Promise<MarketplaceCatalogImportResult> {
  const listingDb = marketplaceProductListingDb();
  if (!listingDb) {
    return {
      ok: false,
      itemsCount: 0,
      matched: 0,
      unmatched: items.length,
      message: MARKETPLACE_PRISMA_STALE_MSG,
    };
  }

  let matched = 0;
  let unmatched = 0;
  const unmatchedSamples: string[] = [];

  for (const item of items) {
    const product = await findProductByBarcodeOrSku(siteId, item.barcode, item.sku);
    if (!product) {
      unmatched++;
      if (unmatchedSamples.length < 5) {
        const label = item.title?.trim() || item.sku || item.barcode || "?";
        unmatchedSamples.push(`${label}${item.barcode ? ` (barkod ${item.barcode})` : ""}`);
      }
      continue;
    }

    matched++;
    await upsertProductMarketplaceListing(siteId, product.id, platform, {
      barcode: item.barcode ?? null,
      listingStatus: item.listingStatus,
      lastError: item.lastError ?? null,
      metaJson: item.meta
        ? JSON.stringify({
            title: item.title,
            ...item.meta,
          })
        : item.title
          ? JSON.stringify({ title: item.title })
          : null,
    });
  }

  const ok = matched > 0 || items.length === 0;
  const unmatchedNote = unmatched
    ? ` · ${unmatched} ürün sitedeki barkodla eşleşmedi` +
      (unmatchedSamples.length
        ? ` (ör. ${unmatchedSamples.join(", ")}). Bu ürünler Trendyol'da var ama sitede aynı barkod yok — sitedeki ürüne Trendyol barkodunu girin.`
        : " — sitedeki ürünlere Trendyol barkodunu girin.")
    : "";
  return {
    ok,
    itemsCount: matched,
    matched,
    unmatched,
    message:
      items.length === 0
        ? "Pazaryerinde ürün bulunamadı"
        : `${matched} ürün eşleştirildi${unmatchedNote}`,
  };
}
